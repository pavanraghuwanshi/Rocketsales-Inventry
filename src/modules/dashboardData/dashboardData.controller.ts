import type { Context } from "hono";
import ProductItem from "../product/productItem.model";
import Product from "../product/product.model";
import Category from "../category/category.model";


//  total stock counts for dashboard
export const getStockCounts = async (c: Context) => {
  try {
    const rackId = c.req.query("rackId");
    const warehouseId = c.req.query("warehouseId");

    const itemMatch: any = {};
    if (rackId) itemMatch.rackId = rackId;
    if (warehouseId) itemMatch.warehouseId = warehouseId;

    const result = await Product.aggregate([
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

    if (!year) {
      return c.json({ success: false, message: "year is required" }, 400);
    }

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const result = await ProductItem.aggregate([
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
    const result = await Category.aggregate([
      // ✅ LEFT JOIN with ProductItem
      {
        $lookup: {
          from: "productitems",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$categoryId", "$$categoryId"] },
                status: "available",
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

    const response = result[0] || {
      total: 0,
      data: [],
    };

    return c.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};