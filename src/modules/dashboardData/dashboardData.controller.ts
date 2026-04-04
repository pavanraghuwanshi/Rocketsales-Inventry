import type { Context } from "hono";
import ProductItem from "../product/productItem.model";
import Product from "../product/product.model";
import Category from "../category/category.model";
import { getRoleFilter } from "../../utils/roleFilteration";
import mongoose from "mongoose";


//  total stock counts for dashboard
export const getStockCounts = async (c: Context) => {
  try {
    const rackId = c.req.query("rackId");
    const warehouseId = c.req.query("warehouseId");

    const roleFilter = getRoleFilter(c, "adminId") as { adminId?: string };;


    const itemMatch: any = {};
    if (rackId) itemMatch.rackId = rackId;
    if (warehouseId) itemMatch.warehouseId = warehouseId;

    const result = await Product.aggregate([
    {
        $match: roleFilter?.adminId
          ? { adminId: new mongoose.Types.ObjectId(roleFilter.adminId) }
          : {}
      },
      // ✅ join with product items
      {
        $lookup: {
          from: "productitems", // collection name (IMPORTANT: check exact name)
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                ...itemMatch,
              },
            },
          ],
          as: "items",
        },
      },

      // ✅ calculate counts per product
      {
        $addFields: {
          availableCount: {
            $size: {
              $filter: {
                input: "$items",
                as: "item",
                cond: { $eq: ["$$item.status", "available"] },
              },
            },
          },
          soldCount: {
            $size: {
              $filter: {
                input: "$items",
                as: "item",
                cond: { $eq: ["$$item.status", "sold"] },
              },
            },
          },
        },
      },

      // ✅ final grouping
      {
        $group: {
          _id: null,

          availableStock: { $sum: "$availableCount" },
          soldStock: { $sum: "$soldCount" },

          // ✅ REAL outOfStock (product level)
          outOfStock: {
            $sum: {
              $cond: [{ $eq: ["$availableCount", 0] }, 1, 0],
            },
          },

          totalProducts: { $sum: 1 },
        },
      },
    ]);

    const counts = result[0] || {
      availableStock: 0,
      soldStock: 0,
      outOfStock: 0,
      totalProducts: 0,
    };

    return c.json({
      success: true,
      data: counts,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

//  total stock counts with date filter for dashboard
export const getStockMovementMonthWise = async (c: Context) => {
  try {
    const { year } = c.req.query();
    const roleFilter = getRoleFilter(c, "adminId") as { adminId?: string };;

    if (!year) {
      return c.json({ success: false, message: "year is required" }, 400);
    }

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const result = await ProductItem.aggregate([
    {
        $match: roleFilter?.adminId
          ? { adminId: new mongoose.Types.ObjectId(roleFilter.adminId) }
          : {}
      },   
      {
        $facet: {
          // ✅ INBOUND (createdAt)
          inbound: [
            {
              $match: {
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: { $month: "$createdAt" },
                count: { $sum: 1 },
              },
            },
          ],

          // ✅ OUTBOUND (outStockDate + sold)
          outbound: [
            {
              $match: {
                status: "sold",
                outStockDate: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: { $month: "$outStockDate" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const inbound = result[0]?.inbound || [];
    const outbound = result[0]?.outbound || [];

    // ✅ merge both into month-wise format (1–12)
    const finalData = [];

    for (let i = 1; i <= 12; i++) {
      const inData = inbound.find((x: any) => x._id === i);
      const outData = outbound.find((x: any) => x._id === i);

      finalData.push({
        month: i,
        inbound: inData ? inData.count : 0,
        outbound: outData ? outData.count : 0,
      });
    }

    return c.json({
      success: true,
      year,
      data: finalData,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

//  get category distribution for dashboard

export const getCategoryDistribution = async (c: Context) => {
  try {

    const roleFilter = getRoleFilter(c, "adminId") as { adminId?: string };


      let extraMatch = {};

      if (roleFilter.adminId) {
        extraMatch = {
          adminId: new mongoose.Types.ObjectId(roleFilter.adminId),
        };
      }

    const result = await Category.aggregate([
      // ✅ LEFT JOIN with ProductItem
    {
        $match: roleFilter?.adminId
          ? { adminId: new mongoose.Types.ObjectId(roleFilter.adminId) }
          : {}
      },
      {
        $lookup: {
          from: "productitems",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$categoryId", "$$categoryId"] },
                status: "available",
                 ...extraMatch, 
              },
            },
          ],
          as: "items",
        },
      },

      // ✅ count available items per category
      {
        $addFields: {
          count: { $size: "$items" },
        },
      },

      // ✅ total calculation
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          categories: {
            $push: {
              name: "$name",
              count: "$count",
            },
          },
        },
      },

      // ✅ unwind for %
      { $unwind: "$categories" },

      // ✅ percentage calculation
      {
        $addFields: {
          "categories.percentage": {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$categories.count", "$total"] },
                  100,
                ],
              },
            ],
          },
        },
      },

      // ✅ final format
      {
        $group: {
          _id: null,
          total: { $first: "$total" },
          data: {
            $push: {
              name: "$categories.name",
              count: "$categories.count",
              percentage: {
                $round: ["$categories.percentage", 2],
              },
            },
          },
        },
      },
    ]);

     const response = result.length
     ? result[0]
     : {
          total: 0,
          data: await Category.find(roleFilter).select("name").lean().then(cats =>
          cats.map(c => ({
               name: c.name,
               count: 0,
               percentage: 0,
          }))
          ),
     };

    return c.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

//  get product aging information for dashboard
export const getProductAging = async (c: Context) => {
  try {
    const rackId = c.req.query("rackId");
    const warehouseId = c.req.query("warehouseId");
    const search = c.req.query("search") || "";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const skip = (page - 1) * limit;

    const roleFilter = getRoleFilter(c, "adminId") as { adminId?: string };

    let extraMatch = {};

      if (roleFilter.adminId) {
        extraMatch = {
          adminId: new mongoose.Types.ObjectId(roleFilter.adminId),
        };
      }

    const itemMatch: any = {
      status: "available",
    };

    if (rackId) itemMatch.rackId = rackId;
    if (warehouseId) itemMatch.warehouseId = warehouseId;

    const result = await Product.aggregate([
     {
     $match: {
     ...extraMatch,
     ...(search && { name: { $regex: search, $options: "i" } }),
     },
     },
      // 🔗 join productItems
      {
        $lookup: {
          from: "productitems",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                ...itemMatch,
                ...extraMatch,
              },
            },
          ],
          as: "items",
        },
      },

      { $unwind: "$items" },

      // 🔗 rack
      {
        $lookup: {
          from: "racks",
          localField: "items.rackId",
          foreignField: "_id",
          as: "rack",
        },
      },
      { $unwind: { path: "$rack", preserveNullAndEmptyArrays: true } },

      // 🔗 warehouse
      {
        $lookup: {
          from: "warehouses",
          localField: "items.warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },

      // 🧠 MAIN CHANGE 👉 grouping per location
      {
        $group: {
          _id: {
            productId: "$_id",
            warehouseId: "$warehouse._id",
            rackId: "$rack._id",
          },

          productName: { $first: "$name" },
          warehouseName: { $first: "$warehouse.name" },
          rackName: { $first: "$rack.name" },

          count: { $sum: 1 },
          oldestItemDate: { $min: "$items.createdAt" },
        },
      },

      // ⏳ aging per location
      {
        $addFields: {
          agingDays: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), "$oldestItemDate"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          productName: 1,
          warehouseName: 1,
          rackName: 1,
          count: 1,
          agingDays: 1,
          oldestItemDate: 1,
        },
      },

      // 🔥 oldest stock first (important)
      {
        $sort: { oldestItemDate: 1 },
      },

      // 📄 pagination
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return c.json({
      success: true,
      data,
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



//  get product Item warehouse-wise Today Activity for dashboard
export const getTodayActivity = async (c: Context) => {
  try {
    const rackId = c.req.query("rackId");
    const warehouseId = c.req.query("warehouseId");
    const search = c.req.query("search") || "";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const skip = (page - 1) * limit;

     const roleFilter = getRoleFilter(c, "adminId") as { adminId?: string };

    let extraMatch = {};

      if (roleFilter.adminId) {
        extraMatch = {
          adminId: new mongoose.Types.ObjectId(roleFilter.adminId),
        };
      }

    // 📅 Today range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const itemMatch: any = {};
    if (rackId) itemMatch.rackId = rackId;
    if (warehouseId) itemMatch.warehouseId = warehouseId;

    const result = await Product.aggregate([
      // 🔍 search
      {
     $match: {
     ...extraMatch,
     ...(search && { name: { $regex: search, $options: "i" } }),
     },
      },

      // 🔗 productItems join
      {
        $lookup: {
          from: "productitems",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                ...itemMatch,
                ...extraMatch,
              },
            },
          ],
          as: "items",
        },
      },

      { $unwind: "$items" },

      // 🔗 rack
      {
        $lookup: {
          from: "racks",
          localField: "items.rackId",
          foreignField: "_id",
          as: "rack",
        },
      },
      { $unwind: { path: "$rack", preserveNullAndEmptyArrays: true } },

      // 🔗 warehouse
      {
        $lookup: {
          from: "warehouses",
          localField: "items.warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },

      // 🔥 split added & sold
      {
        $facet: {
          // ✅ ADDED TODAY
          added: [
            {
              $match: {
                "items.createdAt": {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            },
            {
              $group: {
                _id: {
                  productId: "$_id",
                  warehouseId: "$warehouse._id",
                  rackId: "$rack._id",
                },
                productName: { $first: "$name" },
                warehouseName: { $first: "$warehouse.name" },
                rackName: { $first: "$rack.name" },
                quantity: { $sum: 1 },
              },
            },
          {
          $project: {
          _id: 0, // ❌ remove _id
          productName: 1,
          warehouseName: 1,
          rackName: 1,
          quantity: 1,
          },
          },
            {
              $addFields: {
                type: "added",
              },
            },
          ],

          // ✅ SOLD TODAY (using outStockDate)
          sold: [
            {
              $match: {
                "items.outStockDate": {
                  $ne: null,
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            },
            {
              $group: {
                _id: {
                  productId: "$_id",
                  warehouseId: "$warehouse._id",
                  rackId: "$rack._id",
                },
                productName: { $first: "$name" },
                warehouseName: { $first: "$warehouse.name" },
                rackName: { $first: "$rack.name" },
                quantity: { $sum: 1 },
              },
            },
          {
          $project: {
          _id: 0, // ❌ remove _id
          productName: 1,
          warehouseName: 1,
          rackName: 1,
          quantity: 1,
          },
          },
            {
              $addFields: {
                type: "sold",
              },
            },
          ],
        },
      },

      // 🔗 merge both arrays
      {
        $project: {
          data: { $concatArrays: ["$added", "$sold"] },
        },
      },

      { $unwind: "$data" },
      { $replaceRoot: { newRoot: "$data" } },

      // 🔥 sorting (highest activity first)
      {
        $sort: { quantity: -1 },
      },

      // 📄 pagination
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return c.json({
      success: true,
      data,
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