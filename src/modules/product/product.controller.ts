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
    const user = c.get("user");

    const { adminId, categoryId } = body;
    if (!categoryId) {
      return c.json({ success: false, message: "categoryId is required" }, 400);
    }

    let finalAdminId;
    if (user.role === "superadmin") {
      finalAdminId = adminId || user._id;
    } else {
      finalAdminId = user._id;
    }

    const product = await Product.create({
      ...body,
      adminId: finalAdminId,
      categoryId,
    });

    return c.json({ success: true, data: product });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// GET ALL (with populate 🔥)
export const getProducts = async (c: Context) => {
  try {
    const user = c.get("user");
    const query = paginationSchema.parse(c.req.query());

    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;

    const searchFilter = query.search
      ? { name: { $regex: query.search, $options: "i" } }
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

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("brandId", "name")
        .populate("supplierId", "name email")
        .populate("categoryId", "name")
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
      .populate("supplierId")
      .populate("categoryId");

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
    const user = c.get("user"); // 🔐 logged in user

    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    // 🚫 Unauthorized check
    if (
      user.role !== "superadmin" &&
      existingProduct.adminId?.toString() !== user._id
    ) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }

    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
    });

    return c.json({ success: true, data: product });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// DELETE
export const deleteProduct = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");

    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    // 🚫 Unauthorized check
    if (
      user.role !== "superadmin" &&
      existingProduct.adminId?.toString() !== user._id
    ) {
      return c.json({ success: false, message: "Unauthorized" }, 403);
    }

    await Product.findByIdAndDelete(id);

    return c.json({ success: true, message: "Product deleted" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};