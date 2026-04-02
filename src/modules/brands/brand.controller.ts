import type { Context } from "hono";
import Brand from "./brand.model";
import { z } from "zod";
import { getRoleFilter } from "../../utils/roleFilteration";

export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

// CREATE
export const createBrand = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { name, adminId } = body;

    // ✅ Validate name
    if (!name || !name.trim()) {
      return c.json({ success: false, message: "Brand name is required" }, 400);
    }

    // ✅ Normalize name (avoid Nike vs nike issue)
    const normalizedName = name.trim().toLowerCase();

    let createdBy;

    // ✅ Role handling
    if (user.role === "superadmin") {
      if (!adminId) {
        return c.json(
          { success: false, message: "adminId is required for superadmin" },
          400
        );
      }
      createdBy = adminId;
    } else if (user.role === "admin") {
      createdBy = user.id;
    } else {
      return c.json(
        { success: false, message: "Not authorized to create brand" },
        403
      );
    }

    // ✅ Check duplicate (optional but good UX)
    const existingBrand = await Brand.findOne({
      name: normalizedName,
      adminId: createdBy,
    });

    if (existingBrand) {
      return c.json(
        { success: false, message: "Brand already exists" },
        409
      );
    }

    // ✅ Create brand
    const brand = await Brand.create({
      ...body,
      name: normalizedName,
      adminId: createdBy,
    });

    return c.json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });

  } catch (error: any) {
    // ✅ Handle Mongo duplicate error (important)
    if (error.code === 11000) {
      return c.json(
        { success: false, message: "Brand already exists" },
        409
      );
    }

    return c.json(
      { success: false, message: error.message || "Internal Server Error" },
      500
    );
  }
};

// GET ALL
// export const getBrands = async (c: Context) => {
//   try {
//     const user = c.get("user");
//     const query = paginationSchema.parse(c.req.query());

//     const page = parseInt(query.page || "1");
//     const limit = parseInt(query.limit || "10");
//     const skip = (page - 1) * limit;

//     const searchFilter = query.search
//       ? { name: { $regex: query.search, $options: "i" } }
//       : {};

//     let roleFilter = {};

//     if (user.role === "admin") {
//       roleFilter = { createdBy: user._id };
//     }
//     // superadmin -> no filter (see all)

//     const filter = {
//       ...searchFilter,
//       ...roleFilter,
//     };

//     const [brands, total] = await Promise.all([
//       Brand.find(filter).skip(skip).limit(limit),
//       Brand.countDocuments(filter),
//     ]);

//     return c.json({
//       success: true,
//       data: brands,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error: any) {
//     return c.json({ success: false, message: error.message }, 500);
//   }
// };

export const getBrands = async (c: Context) => {
  try {
    const userFilter = getRoleFilter(c, "adminId");


    const query = paginationSchema.parse(c.req.query());
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;

    const searchFilter = query.search ? { name: { $regex: query.search, $options: "i" } } : {};

    const filter = { ...searchFilter, ...userFilter };

    const [brands, total] = await Promise.all([
      Brand.find(filter).skip(skip).limit(limit),
      Brand.countDocuments(filter),
    ]);

    return c.json({
      success: true,
      data: brands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// GET SINGLE
export const getBrand = async (c: Context) => {
  const id = c.req.param("id");

  const brand = await Brand.findById(id);

  return c.json({ success: true, data: brand });
};

// UPDATE
export const updateBrand = async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const user = c.get("user"); // 🔐 logged in user

  const brand = await Brand.findById(id);

  if (!brand) {
    return c.json({ success: false, message: "Brand not found" }, 404);
  }

  // 🚫 Unauthorized check
  if (
    user.role !== "superadmin" &&
    brand.adminId.toString() !== user.id
  ) {
    return c.json({ success: false, message: "Unauthorized" }, 403);
  }

  const updatedBrand = await Brand.findByIdAndUpdate(id, body, {
    returnDocument: "after",
    runValidators: true,
  });

  return c.json({ success: true, data: updatedBrand });
};

// DELETE
export const deleteBrand = async (c: Context) => {
  const id = c.req.param("id");
  const user = c.get("user");

  const brand = await Brand.findById(id);

  if (!brand) {
    return c.json({ success: false, message: "Brand not found" }, 404);
  }

  // 🚫 Unauthorized check
  if (
    user.role !== "superadmin" &&
    brand.adminId.toString() !== user.id
  ) {
    return c.json({ success: false, message: "Unauthorized" }, 403);
  }

  await Brand.findByIdAndDelete(id);

  return c.json({ success: true, message: "Deleted successfully" });
};