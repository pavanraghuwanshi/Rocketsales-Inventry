import type { Context } from "hono";
import Supplier from "./supplier.model";
import { z } from "zod";




export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

// CREATE
export const createSupplier = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { adminId } = body;
    let finalAdminId;

    if (user.role === "superadmin") {
      finalAdminId = adminId || user._id;
    } else {
      finalAdminId = user._id;
    }

    const supplier = await Supplier.create({
      ...body,
      adminId: finalAdminId,
    });

    return c.json({ success: true, data: supplier });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// GET ALL
export const getSuppliers = async (c: Context) => {
  try {
    const user = c.get("user");
    const query = paginationSchema.parse(c.req.query());

    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;

    const searchFilter = query.search
      ? {
          $or: [
            { name: { $regex: query.search, $options: "i" } },
            { email: { $regex: query.search, $options: "i" } },
          ],
        }
      : {};

    let roleFilter = {};

    if (user.role === "admin") {
      roleFilter = { adminId: user._id };
    }

    const filter = {
      isDeleted: false,
      ...searchFilter,
      ...roleFilter,
    };

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
    ]);

    return c.json({
      success: true,
      data: suppliers,
      meta: {
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
export const getSupplier = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return c.json({ success: false, message: "Supplier not found" }, 404);
    }

    return c.json({ success: true, data: supplier });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// UPDATE
export const updateSupplier = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const user = c.get("user"); // 🔐 logged in user

    const existingSupplier = await Supplier.findById(id);

    if (!existingSupplier) {
      return c.json({ success: false, message: "Supplier not found" }, 404);
    }

    // 🚫 Unauthorized check
    if (
      user.role !== "superadmin" &&
      existingSupplier.adminId?.toString() !== user._id
    ) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }

    const supplier = await Supplier.findByIdAndUpdate(id, body, {
    returnDocument: "after",
    runValidators: true,
  });

    return c.json({ success: true, data: supplier });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// DELETE
export const deleteSupplier = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");

    const existingSupplier = await Supplier.findById(id);

    if (!existingSupplier) {
      return c.json({ success: false, message: "Supplier not found" }, 404);
    }

    // 🚫 Unauthorized check
    if (
      user.role !== "superadmin" &&
      existingSupplier.adminId?.toString() !== user._id
    ) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }

    await Supplier.findByIdAndDelete(id);

    return c.json({ success: true, message: "Supplier deleted" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};