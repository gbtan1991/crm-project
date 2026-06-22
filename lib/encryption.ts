import crypto from "crypto";

const algorithm = "aes-256-cbc";

export function encrypt(text: string, secretKey: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(secretKey).digest();
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string, secretKey: string): string {
  if (!encryptedText) return encryptedText;

  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  const [ivHex, encrypted] = encryptedText.split(":");
  if (!ivHex || !encrypted) return encryptedText;

  const iv = Buffer.from(ivHex, "hex");
  if (iv.length !== 16) return encryptedText;

  const key = crypto.createHash("sha256").update(secretKey).digest();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
