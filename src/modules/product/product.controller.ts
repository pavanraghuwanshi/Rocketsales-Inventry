import type { Context } from "hono";
import Product from "./product.model";
import { z } from "zod";





export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

// CREATE
export const createProduct = async (c: Context) => {
  try {
    const body = await c.req.json();

    const product = await Product.create(body);

    return c.json({ success: true, data: product });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// GET ALL (with populate 🔥)
export const getProducts = async (c: Context) => {
  try {
    const query = paginationSchema.parse(c.req.query());

    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;

    const searchFilter = query.search
      ? { name: { $regex: query.search, $options: "i" } }
      : {};

    const filter = {
      isDeleted: false,
      ...searchFilter,
    };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name")
        .populate("supplierId", "name email")
        .skip(skip)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    return c.json({
      success: true,
      data: products,
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
export const getProduct = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const product = await Product.findById(id)
      .populate("brandId")
      .populate("supplierId");

    if (!product) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    return c.json({ success: true, data: product });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// UPDATE
export const updateProduct = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!product) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    return c.json({ success: true, data: product });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// DELETE
export const deleteProduct = async (c: Context) => {
  try {
    const id = c.req.param("id");

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    return c.json({ success: true, message: "Product deleted" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};