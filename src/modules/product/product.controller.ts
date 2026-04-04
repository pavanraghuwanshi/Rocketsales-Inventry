import type { Context } from "hono";
import Product from "./product.model";
import ProductItem from "./productItem.model";
import Category from "../category/category.model";
import { z } from "zod";
import { getBulkBarcodes } from "../../utils/barcode";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import Brand from "../brands/brand.model";




export const paginationSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
});

// CREATE
// export const createProduct = async (c: Context) => {
//   try {
//     const body = await c.req.json();
//     const user = c.get("user");

//     const {
//       name,
//       price,
//       skuNumber,
//       adminId,
//       brandId,
//       supplierId,
//       categoryId,
//       warehouseId,
//       rackId,
//       quantity,
//     } = body;

//     // ✅ validations
//     if (!skuNumber || !categoryId ||!  brandId || ! supplierId) {
//       return c.json(
//         { success: false, message: "skuNumber, categoryId, brandId, supplierId are required" },
//         400
//       );
//     }

//     if (!warehouseId || !rackId) {
//       return c.json(
//         { success: false, message: "warehouseId and rackId are required" },
//         400
//       );
//     }

//     if (!quantity || quantity < 1) {
//       return c.json(
//         { success: false, message: "quantity must be at least 1" },
//         400
//       );
//     }

//     const finalAdminId =
//       user.role === "superadmin" ? adminId || user.id : user.id;

//     // ✅ check category
//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return c.json({ success: false, message: "Category not found" }, 404);
//     }

//     // 🔥 CHECK EXISTING PRODUCT BY SKU
//     let product = await Product.findOne({ skuNumber });

//     // ✅ product → create
//     if (!product) {
//       if (!name || !price) {
//         return c.json(
//           { success: false, message: "name and price required for new product" },
//           400
//         );
//       }

//       product = await Product.create({
//         name,
//         price,
//         skuNumber,
//         brandId,
//         supplierId,
//         categoryId,
//         adminId: finalAdminId,
//       });
//     }

//     // 🔥 ALWAYS ADD ITEMS
//     const barcodes = await getBulkBarcodes(quantity);

//     const productItems = barcodes.map((barcode) => ({
//       productId: product!._id,
//       warehouseId,
//       rackId,
//       barcodeNumber: barcode,
//       skuNumber,
//       adminId: finalAdminId,
//     }));

//     await ProductItem.insertMany(productItems);

//     return c.json({
//       success: true,
//       data: product,
//       itemsCreated: quantity,
//       message: product ? "Stock added successfully" : "Product created",
//     });

//   } catch (error: any) {
//     return c.json(
//       { success: false, message: error.message },
//       500
//     );
//   }
// };

export const createProduct = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const { name, price, skuNumber, adminId, brandId, categoryId } = body;

    // ✅ validations
    if (!skuNumber || !categoryId || !brandId ) {
      return c.json(
        { success: false, message: "skuNumber, categoryId, brandId, are required" },
        400
      );
    }

    if (!name) {
      return c.json(
        { success: false, message: "name is required for new product" },
        400
      );
    }

    const finalAdminId = user.role === "superadmin" ? adminId || user.id : user.id;

    // ✅ check category
    const category = await Category.findById(categoryId);
    if (!category) {
      return c.json({ success: false, message: "Category not found" }, 404);
    }

    // 🔥 CHECK EXISTING PRODUCT BY SKU
    let product = await Product.findOne({ skuNumber });
    if (product) {
      return c.json({ success: false, message: "Product with this SKU already exists" }, 400);
    }

    // ✅ create product
    product = await Product.create({
      name,
      price,
      skuNumber,
      brandId,
      categoryId,
      adminId: finalAdminId,
    });

    return c.json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};


// product builk create by excel

export const createProductByExcel = async (c: Context) => {
  try {
    const user = c.get("user");

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const adminId = formData.get("adminId");

    if (!file) {
      return c.json({ success: false, message: "Excel file required" }, 400);
    }

    const finalAdminId =
      user.role === "superadmin" ? adminId || user.id : user.id;

    // ✅ read excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames?.[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;

    if (!sheet) {
      return c.json({ success: false, message: "Invalid Excel sheet" }, 400);
    }

    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      return c.json({ success: false, message: "Empty Excel" }, 400);
    }

    // ✅ normalize
    const normalizeKeys = (obj: any) => {
      const newObj: any = {};
      for (let key in obj) {
        newObj[key.trim().toLowerCase()] = obj[key];
      }
      return newObj;
    };

    // ✅ header validation
    const requiredHeaders = ["name", "skunumber"];

    const firstRow = normalizeKeys(rows[0]);
    const excelHeaders = Object.keys(firstRow);

    const missingHeaders = requiredHeaders.filter(
      (h) => !excelHeaders.includes(h)
    );

    if (missingHeaders.length > 0) {
      return c.json({
        success: false,
        message: "Invalid Excel format. Please fix headers.",
        missingHeaders,
        expectedFormat: requiredHeaders,
        receivedHeaders: excelHeaders,
      }, 400);
    }

    // ✅ pre-fetch brand & category
    const allBrands = await Brand.find().select("_id name");
    const allCategories = await Category.find().select("_id name");

    const brandMap = new Map(
      allBrands.map((b) => [b.name.toLowerCase(), b._id])
    );

    const categoryMap = new Map(
      allCategories.map((c) => [c.name.toLowerCase(), c._id])
    );

    // ✅ existing SKU check
    const skus = rows.map((r) => normalizeKeys(r).skunumber);

    const existingProducts = await Product.find({
      skuNumber: { $in: skus },
    }).select("skuNumber");

    const existingSkuSet = new Set(
      existingProducts.map((p) => p.skuNumber)
    );

    const validProducts: any[] = [];
    const errorProducts: any[] = [];

    for (const row of rows) {
      const cleanRow = normalizeKeys(row);

      const name = cleanRow.name?.toString().trim();
      const skuNumber = cleanRow.skunumber?.toString().trim();
      const price = cleanRow.price;
      const brandName = cleanRow.brandname;
      const categoryName = cleanRow.categoryname;

      // ❌ required validation
      if (!name || !skuNumber) {
        errorProducts.push({ ...row, error: "name & skuNumber are required" });
        continue;
      }

      // ❌ duplicate SKU
      if (existingSkuSet.has(skuNumber)) {
        errorProducts.push({ ...row, error: "SKU already exists" });
        continue;
      }

      // ✅ optional mapping
      let brandId = undefined;
      let categoryId = undefined;

      if (brandName) {
        const foundBrand = brandMap.get(brandName.toLowerCase());
        if (foundBrand) brandId = foundBrand;
      }

      if (categoryName) {
        const foundCategory = categoryMap.get(categoryName.toLowerCase());
        if (foundCategory) categoryId = foundCategory;
      }

      validProducts.push({
        name,
        skuNumber,
        price,
        ...(brandId && { brandId }),
        ...(categoryId && { categoryId }),
        adminId: finalAdminId,
      });

      existingSkuSet.add(skuNumber); // prevent duplicate in same file
    }

    if (validProducts.length > 0) {
      await Product.insertMany(validProducts);
    }

    return c.json({
      success: true,
      insertedCount: validProducts.length,
      errorCount: errorProducts.length,
      errors: errorProducts,
      message: "Products uploaded via Excel",
    });

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

    // 🔍 Search
    const searchFilter = query.search
      ? { name: { $regex: query.search, $options: "i" } }
      : {};

    // 👤 Role filter
    const roleFilter =
      user.role === "admin"
        ? { adminId: new mongoose.Types.ObjectId(user.id) }
        : {};

    const matchFilter = {
      ...searchFilter,
      ...roleFilter,
    };

    const result = await Product.aggregate([
      { $match: matchFilter },

      {
        $facet: {
          data: [
            // 🔥 OPTIMIZED QUANTITY LOOKUP (no heavy array)
           {
            $lookup: {
              from: "productitems",
              let: { productId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$productId", "$$productId"] },
                    status: "available", // ✅ only available items
                  },
                },
                { $count: "total" },
              ],
              as: "stockData",
            },
          },
            // ➕ extract quantity
            {
              $addFields: {
                totalQuantity: {
                  $ifNull: [
                    { $arrayElemAt: ["$stockData.total", 0] },
                    0,
                  ],
                },
              },
            },

            // ❌ remove temp field
            {
              $project: { stockData: 0 },
            },

            // 🔗 brand
            {
              $lookup: {
                from: "brands",
                localField: "brandId",
                foreignField: "_id",
                as: "brandId",
              },
            },
            { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },

            // 🔗 category
            {
              $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryId",
              },
            },
            { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },

            // ✅ FINAL RESPONSE SHAPE
            {
              $project: {
                _id: 1,
                name: 1,
                price: 1,
                skuNumber: 1,
                totalQuantity: 1,
                createdAt: 1,
                updatedAt: 1,

                "categoryId._id": 1,
                "categoryId.name": 1,

                "brandId._id": 1,
                "brandId.name": 1,
              },
            },

            // 📄 Pagination
            { $skip: skip },
            { $limit: limit },
          ],

          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    const products = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.total || 0;

    return c.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      500
    );
  }
};


// get products drop-down

export const getProductsDropdown = async (c: Context) => {
  try {
    const user = c.get("user");
    const query = paginationSchema.parse(c.req.query());

    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;

    const { search, brandId, categoryId } = query;

    // 🔍 Search
    const searchFilter = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    // 👤 Role filter
    const roleFilter =
      user.role === "admin"
        ? { adminId: new mongoose.Types.ObjectId(user.id) }
        : {};

    // 🧠 Optional filters
    const optionalFilter: any = {};

    if (brandId) {
      optionalFilter.brandId = new mongoose.Types.ObjectId(brandId);
    }

    if (categoryId) {
      optionalFilter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    const matchFilter = {
      ...searchFilter,
      ...roleFilter,
      ...optionalFilter,
    };

    const result = await Product.aggregate([
      { $match: matchFilter },

      {
        $facet: {
          data: [
            {
              $project: {
                _id: 1,
                name: 1,
                skuNumber: 1,
              },
            },
            { $skip: skip },
            { $limit: limit },
          ],

          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    const products = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.total || 0;

    return c.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return c.json(
      { success: false, message: error.message },
      500
    );
  }
};



// GET SINGLE
export const getProduct = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const query = c.req.query(); // page, limit, status filter
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "10");
    const skip = (page - 1) * limit;
    const statusFilter = query.status || null; // optional filter

    // Aggregate for product + items
    const result = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },

      // Lookup items with filter, pagination, sorting
      {
        $lookup: {
          from: "productitems",
          let: { productId: "$_id" },
          pipeline: [
            { $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                ...(statusFilter ? { status: statusFilter } : {}),
            }},
            { $sort: { createdAt: -1 } }, // latest first
            { $skip: skip },
            { $limit: limit }
          ],
          as: "items"
        }
      },

      // Lookup brand
      {
        $lookup: {
          from: "brands",
          localField: "brandId",
          foreignField: "_id",
          as: "brandId",
        },
      },
      { $unwind: { path: "$brandId", preserveNullAndEmptyArrays: true } },

      // Lookup category
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
        },
      },
      { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },

      // Optional: total count of items (all, for pagination info)
      {
        $lookup: {
          from: "productitems",
          let: { productId: "$_id" },
          pipeline: [
            { $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                ...(statusFilter ? { status: statusFilter } : {}),
            }},
            { $sort: { createdAt: -1 } }, // latest first
            { $skip: skip },
            { $limit: limit },
            // ✅ Project only required fields
            { $project: {
                _id: 1,
                barcodeNumber: 1,
                skuNumber: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1
            }}
          ],
          as: "items"
        }
      },
      {
        $addFields: {
          totalItems: { $ifNull: [{ $arrayElemAt: ["$totalItems.total", 0] }, 0] }
        }
      },

      // Project clean response
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          skuNumber: 1,
          createdAt: 1,
          updatedAt: 1,
          brandId: { _id: 1, name: 1 },
          categoryId: { _id: 1, name: 1 },
          items: 1,
          totalItems: 1,
        }
      }
    ]);

    if (!result[0]) {
      return c.json({ success: false, message: "Product not found" }, 404);
    }

    const product = result[0];

    return c.json({
      success: true,
      data: product,
      pagination: {
        total: product.totalItems,
        page,
        limit,
        totalPages: Math.ceil(product.totalItems / limit),
      },
    });

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