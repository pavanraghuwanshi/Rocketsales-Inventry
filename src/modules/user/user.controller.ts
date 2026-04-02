import type { Context } from "hono";
import { User } from "../../modules/user/user.model.ts";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";
import { setCookie } from "hono/cookie";
import type { Types } from "mongoose";
import { decryptPassword, encryptPassword } from "../../utils/crypto.ts";


const JWT_SECRET = process.env.JWT_SECRET as string;

// ✅ Request Types
interface RegisterBody {
  name: string;
  username: string;
  password: string;
  role?: "superadmin" | "admin" | "user";
  adminId?: Types.ObjectId;
}


// Login Types
interface LoginBody {
  username: string;
  password: string;
}


const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
};


// ✅ Register

export const register = async (c: Context) => {
  try {
    const body = await c.req.json<RegisterBody>();
    const { name, username, password, role, adminId } = body;

    if (!name || !username || !password) {
      return c.json({ message: "All fields are required" }, 400);
    }

    // 👉 get logged in user from local context populated by verifyToken
    const loggedInUser = c.get("user");


    if (!loggedInUser) {
      return c.json({ message: "Unauthorized user" }, 401);
    }

    // 👉 check existing user
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return c.json({ message: "User already exists" }, 400);
    }

    // 👉 encrypt password
    const encryptedPassword = await encryptPassword(password);

    // 🔥 HIERARCHY BASED ROLE AND adminId LOGIC
    let safeRole = role || "user";
    let finaladminId;

    if (loggedInUser.role === "superadmin") {
      // ✅ superadmin can create admin or user
      if (!["admin", "user"].includes(safeRole)) {
        return c.json({ message: "Superadmin can only create admin or user roles" }, 400);
      }
      // superadmin kisi aur ke liye (like admin) assigned bhi kar sakta hai
      finaladminId = adminId || loggedInUser.id;
    } else if (loggedInUser.role === "admin") {
      // ✅ admin can only create user
      if (safeRole !== "user") {
        return c.json({ message: "Admins are only allowed to create users" }, 403);
      }
      // admin apne liye hi create karega
      finaladminId = loggedInUser.id;
    } else {
      // ✅ users/others cannot create accounts natively from this endpoint
      return c.json({ message: "You do not have permission to create users" }, 403);
    }


    // 👉 create user
    const user = await User.create({
      name,
      username,
      password: encryptedPassword,
      role: safeRole,
      adminId: finaladminId,
    });

    return c.json(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        adminId: user.adminId, // ✅ clean
      },
      201
    );
  } catch (error) {
    console.error("Register Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};


//  Get All Users
export const getAllUsers = async (c: Context) => {
  try {
    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized user" }, 401);
    }

    // 👉 query params for pagination and search
    const { page = "1", limit = "10", search = "" } = c.req.query();
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // 👉 build search filter
    const searchFilter: any = {};
    if (search) {
      // search by name or username (case-insensitive)
      searchFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    // 👉 filter based on hierarchy
    if (loggedInUser.role === "admin") {
      // admin sees only users under their adminId
      searchFilter.adminId = loggedInUser.id;
    } else if (loggedInUser.role === "superadmin") {
       searchFilter.role = { $ne: "superadmin" };
      // superadmin sees all users
    } else {
      return c.json({ message: "You do not have permission to view users" }, 403);
    }

    // 👉 get total count for pagination
    const total = await User.countDocuments(searchFilter);

    // 👉 fetch users with pagination
    const users = await User.find(searchFilter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select("name username role adminId password") // ✅ only expose needed fields
      .sort({ createdAt: -1 }); // latest first


      const updatedUsers = users.map((user) => {
      const obj = user.toObject();

      const { password, ...rest } = obj; // 👈 remove original password

      return {
        ...rest,
        password: decryptPassword(password), // 👈 decrypted as password
      };
    });

      

    return c.json({
      success: true,
      data: updatedUsers,
      pagination: {
        total,
        page:pageNum,
        limit:limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};



//  Update User
export const updateUser = async (c: Context) => {
  try {
    const userId = c.req.param("id"); // ✅ params se id
    const body = await c.req.json();

    const { name, username, password, role, adminId } = body;

    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized user" }, 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // 🔥 ROLE BASED LOGIC
    let safeRole = role || user.role;
    let finaladminId = user.adminId;

    if (loggedInUser.role === "superadmin") {
      if (role && !["admin", "user"].includes(role)) {
        return c.json({ message: "Invalid role" }, 400);
      }
      finaladminId = adminId || user.adminId;
    } 
    else if (loggedInUser.role === "admin") {
      if (user.role !== "user") {
        return c.json({ message: "Admins can only update users" }, 403);
      }

      if (user.adminId.toString() !== loggedInUser.id) {
        return c.json({ message: "Not your user" }, 403);
      }

      safeRole = "user";
      finaladminId = loggedInUser.id;
    } 
    else {
      return c.json({ message: "No permission" }, 403);
    }

    // 🔐 Update fields
    if (name) user.name = name;
    if (username) user.username = username;

    if (password) {
      user.password = await encryptPassword(password);
    }

    user.role = safeRole;
    user.adminId = finaladminId;

    await user.save();

    return c.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        adminId: user.adminId,
      },
    });

  } catch (error) {
    console.error("Update Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};

//  Delete User
export const deleteUser = async (c: Context) => {
  try {
    const userId = c.req.param("id"); // ✅ params se id

    const loggedInUser = c.get("user");

    if (!loggedInUser) {
      return c.json({ message: "Unauthorized user" }, 401);
    }

    const user = await User.findById(userId);

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // 🔥 ROLE BASED DELETE
    if (loggedInUser.role === "superadmin") {
      if (!["admin", "user"].includes(user.role)) {
        return c.json({ message: "Cannot delete this role" }, 403);
      }
    } 
    else if (loggedInUser.role === "admin") {
      if (user.role !== "user") {
        return c.json({ message: "Admins can only delete users" }, 403);
      }

      if (user.adminId.toString() !== loggedInUser.id) {
        return c.json({ message: "Not your user" }, 403);
      }
    } 
    else {
      return c.json({ message: "No permission" }, 403);
    }

    // ❌ prevent self delete
    if (user._id.toString() === loggedInUser.id) {
      return c.json({ message: "You cannot delete yourself" }, 400);
    }

    await User.findByIdAndDelete(userId);

    return c.json({
      success: true,
      message: "User deleted successfully",
    });

  } catch (error) {
    console.error("Delete Error:", error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};


// ✅ Login


export const login = async (c: Context) => {
  const body = await c.req.json<LoginBody>();
  const { username, password } = body;

  if (!username || !password) {
    return c.json(
      { message: "username and password required" },
      400
    );
  }

  const user = await User.findOne({ username }).exec();

  if (!user) {
    return c.json(
      { message: "User not found" },
      404
    );
  }

  const decryptedPassword = decryptPassword(user.password);

  const isMatch = password === decryptedPassword;

  if (!isMatch) {
    return c.json(
      { message: "Invalid credentials" },
      401
    );
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    } as JwtPayload,
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  return c.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
    },
  });
};




// export const login = async (c: Context) => {
//   const body = await c.req.json<LoginBody>();
//   const { username, password } = body;

//   if (!username || !password) {
//     return c.json({ message: "username and password required" }, 400);
//   }

//   const user = await User.findOne({ username }).exec();

//   if (!user) {
//     return c.json({ message: "User not found" }, 404);
//   }

//   const isMatch = await bcrypt.compare(password, user.password);

//   if (!isMatch) {
//     return c.json({ message: "Invalid credentials" }, 401);
//   }

//   const token = jwt.sign(
//     {
//       id: user._id.toString(),
//       role: user.role,
//     } as JwtPayload,
//     getJwtSecret(),
//     { expiresIn: "7d" }
//   );

//   // ✅ 🍪 Set Cookie
//   // setCookie(c, "token", token, {
//   //   httpOnly: true,        // 🔒 cannot access via JS (secure)
//   //   secure: true,          // HTTPS only (production)
//   //   sameSite: "Strict",    // CSRF protection
//   //   maxAge: 60 * 60 * 24 * 7, // 7 days
//   //   path: "/",
//   // });
//     setCookie(c, "token", token, {
//     httpOnly: true,
//     secure: true,      // Render (HTTPS)
//     sameSite: "None",  // cross-origin ke liye
//     path: "/",
//   });

//   return c.json({
//     message: "Login successful",
//     user: {
//       id: user._id,
//       username: user.username,
//       role: user.role,
//     },
//   });
// };