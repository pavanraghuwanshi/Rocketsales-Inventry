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

    const supplier = await Supplier.create(body);

    return c.json({ success: true, data: supplier });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// GET ALL
export const getSuppliers = async (c: Context) => {
  try {
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

    const filter = {
      isDeleted: false,
      ...searchFilter,
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

    const supplier = await Supplier.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!supplier) {
      return c.json({ success: false, message: "Supplier not found" }, 404);
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

    const supplier = await Supplier.findByIdAndDelete(id);

    if (!supplier) {
      return c.json({ success: false, message: "Supplier not found" }, 404);
    }

    return c.json({ success: true, message: "Supplier deleted" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};