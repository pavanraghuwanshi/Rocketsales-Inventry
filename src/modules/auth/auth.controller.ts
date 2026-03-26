import { User } from "../../modules/user/user.model.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../auth/auth.type.ts";

const JWT_SECRET = process.env.JWT_SECRET as string;


interface LoginBody {
  email: string;
  password: string;
}




// ✅ Login
export const login = async (req: Request): Promise<Response> => {
  const body = (await req.json()) as LoginBody;
  const { email, password } = body;

  if (!email || !password) {
    return Response.json(
      { message: "Email and password required" },
      { status: 400 }
    );
  }

  const user = await User.findOne({ email }).exec();

  if (!user) {
    return Response.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return Response.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    } as JwtPayload,
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return Response.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
};