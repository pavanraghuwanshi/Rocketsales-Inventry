import type { Context } from "hono"; // adjust based on your framework

export const getRoleFilter = (c: Context, adminField: string) => {
  const user = c.get("user");

  console.log(user,"gggggg")

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