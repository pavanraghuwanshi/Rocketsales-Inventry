import crypto from "crypto";

// 🔒 Config
const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = process.env.CRYPTO_SECRET as string; // must be 32 chars

if (!SECRET_KEY || SECRET_KEY.length !== 32) {
  throw new Error("CRYPTO_SECRET must be 32 characters long");
}

// 🔐 Types
type EncryptedData = {
  iv: string;
  content: string;
};

// ---------------- ENCRYPT ----------------
export const encryptPassword = (text: string): EncryptedData => {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input for encryption");
  }

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(SECRET_KEY, "utf-8"), // ✅ explicitly utf-8
    iv
  );

  // 🔥 CHANGE HERE (use Buffer)
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  };
};

// ---------------- DECRYPT ----------------
export const decryptPassword = (data: EncryptedData): string => {
  try {
    if (!data?.iv || !data?.content) {
      throw new Error("Invalid encrypted data");
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(SECRET_KEY, "utf-8"), // ✅ explicitly utf-8
      Buffer.from(data.iv, "hex")
    );

    // 🔥 CHANGE HERE (use Buffer)
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data.content, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decrypt error:", error);
    throw new Error("Failed to decrypt password");
  }
};