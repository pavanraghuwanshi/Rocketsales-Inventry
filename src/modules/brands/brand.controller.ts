import type { Context } from "hono";
import Brand from "./brand.model";
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

// CREATE
export const createBrand = async (c: Context) => {
  const body = await c.req.json();

    const { name } = body;

  if (!name) {
    return c.json({ success: false, message: "Brand name is required" }, 400);
  }

  // 🔍 Duplicate Check
  const existingBrand = await Brand.findOne({ name: name.trim() });

  if (existingBrand) {
    return c.json(
      { success: false, message: "Brand already exists" },
      409
    );
  }

  const brand = await Brand.create(body);

  return c.json({ success: true, data: brand });
};

// GET ALL
export const getBrands = async (c: Context) => {
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

    const [brands, total] = await Promise.all([
      Brand.find(filter).skip(skip).limit(limit),
      Brand.countDocuments(filter),
    ]);

    return c.json({
      success: true,
      data: brands,
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
export const getBrand = async (c: Context) => {
  const id = c.req.param("id");

  const brand = await Brand.findById(id);

  return c.json({ success: true, data: brand });
};

// UPDATE
export const updateBrand = async (c: Context) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const brand = await Brand.findByIdAndUpdate(id, body, { new: true });

  return c.json({ success: true, data: brand });
};

// DELETE
export const deleteBrand = async (c: Context) => {
  const id = c.req.param("id");

  await Brand.findByIdAndDelete(id);

  return c.json({ success: true, message: "Deleted" });
};