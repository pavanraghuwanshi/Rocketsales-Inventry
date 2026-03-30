



import type { Context } from "hono";
import Category from "./category.model";
import { z } from "zod";

export const paginationSchema = z.object({
	page: z.string().optional(),
	limit: z.string().optional(),
	search: z.string().optional(),
});

// Create Category
export const createCategory = async (c: Context) => {
	try {
		const body = await c.req.json();
		const { name, adminId } = body;
		if (!name) {
			return c.json({ success: false, message: "Category name is required" }, 400);
		}

		// Prevent duplicate category for same admin
		const existingCategory = await Category.findOne({ name: name.trim(), adminId });
		if (existingCategory) {
			return c.json({ success: false, message: "Category already exists for this admin" }, 409);
		}

		const category = await Category.create({ name: name.trim(), adminId });
		return c.json({ success: true, data: category }, 201);
	} catch (error) {
		const err = error as Error;
		return c.json({ success: false, message: "Failed to create category", error: err.message }, 500);
	}
};

// Get all categories with pagination and search
export const getCategories = async (c: Context) => {
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
		if (user && user.role === "admin") {
			roleFilter = { adminId: user._id };
		}

		const filter = {
			...searchFilter,
			...roleFilter,
		};

		const [categories, total] = await Promise.all([
			Category.find(filter).skip(skip).limit(limit),
			Category.countDocuments(filter),
		]);

		return c.json({
			success: true,
			data: categories,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		const err = error as Error;
		return c.json({ success: false, message: "Failed to fetch categories", error: err.message }, 500);
	}
};

// Get single category by ID
export const getCategoryById = async (c: Context) => {
	try {
		const { id } = c.req.param();
		const category = await Category.findById(id);
		if (!category) return c.json({ success: false, message: "Category not found" }, 404);
		return c.json({ success: true, data: category });
	} catch (error) {
		const err = error as Error;
		return c.json({ success: false, message: "Failed to fetch category", error: err.message }, 500);
	}
};

// Update category
export const updateCategory = async (c: Context) => {
	try {
		const { id } = c.req.param();
		const body = await c.req.json();
		const { name } = body;
		if (!name) {
			return c.json({ success: false, message: "Category name is required" }, 400);
		}

		// Find the category to get adminId
		const existing = await Category.findById(id);
		if (!existing) return c.json({ success: false, message: "Category not found" }, 404);

		// Prevent duplicate category for same admin (excluding current)
		const duplicate = await Category.findOne({ name: name.trim(), adminId: existing.adminId, _id: { $ne: id } });
		if (duplicate) {
			return c.json({ success: false, message: "Category already exists for this admin" }, 409);
		}

		const category = await Category.findByIdAndUpdate(id, { name: name.trim() },  {
          returnDocument: "after",
          runValidators: true,
          });
		return c.json({ success: true, data: category });
	} catch (error) {
		const err = error as Error;
		return c.json({ success: false, message: "Failed to update category", error: err.message }, 500);
	}
};


// Delete category
export const deleteCategory = async (c: Context) => {
	try {
		const { id } = c.req.param();
		const category = await Category.findByIdAndDelete(id);
		if (!category) return c.json({ success: false, message: "Category not found" }, 404);
		return c.json({ success: true, message: "Category deleted" });
	} catch (error) {
		const err = error as Error;
		return c.json({ success: false, message: "Failed to delete category", error: err.message }, 500);
	}
};
