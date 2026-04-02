import type { Context } from "hono";
import Supplier from "./supplier.model";
import { z } from "zod";
import { getRoleFilter } from "../../utils/roleFilteration";




export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

const getAdminId = (user: any, bodyAdminId?: string) => {
  if (user.role === "admin") return user.id;
  return bodyAdminId || user.id;
};

// CREATE
export const createSupplier = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const finalAdminId = getAdminId(user, body.adminId);

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
    const userFilter = getRoleFilter(c, "adminId");

    const query = paginationSchema.parse(c.req.query());
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;

    const searchFilter = query.search
      ? { $or: [{ name: { $regex: query.search, $options: "i" } }, { email: { $regex: query.search, $options: "i" } }] }
      : {};

    const filter = { ...searchFilter, ...userFilter };

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).populate("adminId", "name").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Supplier.countDocuments(filter),
    ]);

    return c.json({
      success: true,
      data: suppliers,
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

//  GET dropdown (id and name only, with search)
export const getSuppliersDropdown = async (c: Context) => {
  try {
    const userFilter = getRoleFilter(c, "adminId");

    const query = c.req.query();
    const search = query.search;

    const searchFilter = search
      ? {
          name: { $regex: search, $options: "i" },
        }
      : {};

    const filter = { ...searchFilter, ...userFilter };

    const suppliers = await Supplier.find(filter)
      .select("_id name") // ✅ only required fields
      .sort({ name: 1 });

    return c.json({
      success: true,
      data: suppliers,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// GET SINGLE
export const getSupplier = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");

    let adminId: any = undefined;

    if (user.role === "admin") {
      adminId = user.id;
    }

    const supplier = await Supplier.findOne({
      _id: id,
      ...(adminId && { adminId }),
    });

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
    const user = c.get("user");

    let adminId: any = undefined;

    if (user.role === "admin") {
      adminId = user.id;
    }

    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: id,
        ...(adminId && { adminId }),
      },
      body,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!supplier) {
      return c.json({ success: false, message: "Supplier not found or unauthorized" }, 404);
    }

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
      existingSupplier.adminId?.toString() !== user.id
    ) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }

    await Supplier.findByIdAndDelete(id);

    return c.json({ success: true, message: "Supplier deleted" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};