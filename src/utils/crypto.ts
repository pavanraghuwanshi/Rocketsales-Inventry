import { randomBytes, pbkdf2Sync } from "crypto";

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");

  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  return `${salt}:${hash}`;
};

export const comparePassword = (password: string, stored: string) => {
  const [salt, originalHash] = stored.split(":");

  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

  return hash === originalHash;
};