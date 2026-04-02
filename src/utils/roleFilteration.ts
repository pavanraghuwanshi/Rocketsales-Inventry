import type { Context } from "hono";
import mongoose from "mongoose";


export const getRoleFilter = (c: Context, adminField: string) => {
  const user = c.get("user");


  if (!user) throw new Error("User not found in context");

  switch (user.role) {
    case "superadmin":
      // sees everything
      return {};

    case "admin":
      // sees only their own created data
      return { [adminField]: user.id };

    case "user":
      // sees only data of their admin
      if (!user.adminId) throw new Error("No admin assigned for this user");
      return { [adminField]: user.adminId };

    default:
      // any future roles → block by default
      return { id: null };
  }
};



export const resolveAdminId = (user: any, bodyAdminId?: string) => {
	switch (user.role) {
		case "superadmin":
			if (!bodyAdminId) {
				throw new Error("adminId is required for superadmin");
			}
			return new mongoose.Types.ObjectId(bodyAdminId);

		case "admin":
			return new mongoose.Types.ObjectId(user.id);

		case "user":
			if (!user.adminId) {
				throw new Error("No admin assigned to this user");
			}
			return new mongoose.Types.ObjectId(user.adminId);

		default:
			throw new Error("Unauthorized role");
	}
};