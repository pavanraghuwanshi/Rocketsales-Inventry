import type { Context } from "hono";

import Warehouse from "./warehouse.model";
import Rack from "./rack.model";
import ProductItem from "../product/productItem.model";
import mongoose from "mongoose";


export const createWarehouse = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user"); // from middleware

    let { name, adminId, racks } = body;

    // 👉 Role-based adminId logic
    if (user.role === "admin") {
      adminId = user.id;
    }

    if (!adminId) {
      return c.json({ success: false, message: "adminId is required" }, 400);
    }

    if (!name) {
      return c.json({ success: false, message: "Warehouse name is required" }, 400);
    }

    // Prevent duplicate warehouse
    const existing = await Warehouse.findOne({
      name: name.trim(),
      adminId,
    });

    if (existing) {
      return c.json(
        { success: false, message: "Warehouse already exists for this admin" },
        409
      );
    }

    const warehouse = await Warehouse.create({
      name: name.trim(),
      adminId,
    });

    // Create racks
    let createdRacks = [];
    if (Array.isArray(racks)) {
      for (const rack of racks) {
        if (!rack.name || !rack.capacity) continue;

        const rackDoc = await Rack.create({
          name: rack.name.trim(),
          warehouseId: warehouse._id,
          capacity: rack.capacity,
          adminId,
        });

        createdRacks.push(rackDoc);
      }
    }

    return c.json(
      { success: true, data: warehouse, racks: createdRacks },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

// Update warehouse and its racks (capacity inc/dec, add new racks)
export const updateWarehouse = async (c: Context) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const user = c.get("user");

    let { name, racks, adminId } = body;

    // Role logic
    if (user.role === "admin") {
      adminId = user.id;
    }

    const warehouse = await Warehouse.findOneAndUpdate(
      { _id: id, adminId },
      { name },
       {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!warehouse) {
      return c.json({ success: false, message: "Warehouse not found" }, 404);
    }

    let updatedRacks = [];

    if (Array.isArray(racks)) {
      for (const rack of racks) {
        if (rack._id) {
          const updated = await Rack.findOneAndUpdate(
            { _id: rack._id, adminId },
            { name: rack.name, capacity: rack.capacity },
            {
          returnDocument: "after",
          runValidators: true,
          }
          );
          if (updated) updatedRacks.push(updated);
        } else if (rack.name && rack.capacity) {
          const newRack = await Rack.create({
            name: rack.name.trim(),
            warehouseId: warehouse._id,
            capacity: rack.capacity,
            adminId,
          });
          updatedRacks.push(newRack);
        }
      }
    }

    return c.json({ success: true, data: warehouse, racks: updatedRacks });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};


//  get ware house with search or pagination
export const getWarehouses = async (c: Context) => {
  try {
    const user = c.get("user");

    let adminId = c.req.query("adminId");
    const search = c.req.query("search") || "";

    // Role logic
    if (user.role === "admin") {
      adminId = user._id;
    }

    // Pagination
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const skip = (page - 1) * limit;

    // Filter
    const filter: any = {};
    if (adminId) filter.adminId = new mongoose.Types.ObjectId(adminId);
    if (search) filter.name = { $regex: search, $options: "i" };

    // Get warehouses with pagination
    const warehouses = await Warehouse.find(filter)
      .populate("adminId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const warehouseIds = warehouses.map(w => w._id);

    // Count racks per warehouse
    const racksCount = await Rack.aggregate([
      { $match: { warehouseId: { $in: warehouseIds } } },
      { $group: { _id: "$warehouseId", totalRacks: { $sum: 1 } } },
    ]);

    // Count items per warehouse (via racks)
    const itemsCount = await ProductItem.aggregate([
      { $match: { warehouseId: { $in: warehouseIds } } },
      { $group: { _id: "$warehouseId", totalItems: { $sum: 1 } } },
    ]);

    // Merge counts into warehouses
    const data = warehouses.map(w => {
      const rackData = racksCount.find(r => r._id.toString() === w._id.toString());
      const itemData = itemsCount.find(i => i._id.toString() === w._id.toString());
      return {
        ...w.toObject(),
        totalRacks: rackData?.totalRacks || 0,
        totalItems: itemData?.totalItems || 0,
      };
    });

    const total = await Warehouse.countDocuments(filter);

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




// Get rack-wise items summary with pagination & search
export const getRackItemsSummary = async (c: Context) => {
  try {
    const warehouseId = c.req.query("warehouseId");
    if (!warehouseId) {
      return c.json({ success: false, message: "warehouseId is required" }, 400);
    }

    const search = c.req.query("search") || "";

    // Pagination
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const skip = (page - 1) * limit;

    // Fetch racks of this warehouse with search
    const filter: any = { warehouseId };
    if (search) filter.name = { $regex: search, $options: "i" };

    const [racks, total] = await Promise.all([
      Rack.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Rack.countDocuments(filter),
    ]);

    const rackIds = racks.map(r => r._id);

    // Aggregate productitems counts per rack by status
    const itemsSummary = await ProductItem.aggregate([
      { $match: { rackId: { $in: rackIds } } },
      {
        $group: {
          _id: "$rackId",
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
          sold: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
          damaged: { $sum: { $cond: [{ $eq: ["$status", "damaged"] }, 1, 0] } },
          totalItems: { $sum: 1 },
        },
      },
    ]);

    // Merge counts into racks
    const data = racks.map(r => {
      const summary = itemsSummary.find(i => i._id.toString() === r._id.toString());
      return {
        _id: r._id,
        name: r.name,
        totalItems: summary?.totalItems || 0,
        available: summary?.available || 0,
        sold: summary?.sold || 0,
        damaged: summary?.damaged || 0,
      };
    });

    return c.json({
      success: true,
      warehouseId,
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
