import type { Context } from "hono";
import ProductItem from "../product/productItem.model";



export const getStockCounts = async (c: Context) => {
  try {
    const rackId = c.req.query("rackId");
    const warehouseId = c.req.query("warehouseId");

    // optional filters
    const match: any = {};

    if (rackId) match.rackId = rackId;
    if (warehouseId) match.warehouseId = warehouseId;

    const result = await ProductItem.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: null,
          availableStock: {
            $sum: {
              $cond: [{ $eq: ["$status", "available"] }, 1, 0],
            },
          },
          outOfStock: {
            $sum: {
              $cond: [{ $eq: ["$status", "sold"] }, 1, 0],
            },
          },

          totalItems: { $sum: 1 },
        },
      },
    ]);

    const counts = result[0] || {
      availableStock: 0,
      outOfStock: 0,
      inStock: 0,
      totalItems: 0,
    };

    return c.json({
      success: true,
      data: counts,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};