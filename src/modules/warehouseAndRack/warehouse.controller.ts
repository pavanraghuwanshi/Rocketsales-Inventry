import type { Context } from "hono";

import Warehouse from "./warehouse.model";
import Rack from "./rack.model";

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

    // 👉 Role logic
    if (user.role === "admin") {
      adminId = user._id;
    }

    // 👉 Pagination
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const skip = (page - 1) * limit;

    // 👉 Filter
    let filter: any = {};

    if (adminId) {
      filter.adminId = adminId;
    }

    // 👉 Search (case-insensitive)
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [warehouses, total] = await Promise.all([
      Warehouse.find(filter)
        .populate("adminId","name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),

      Warehouse.countDocuments(filter),
    ]);

    return c.json({
      success: true,
      data: warehouses,
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
