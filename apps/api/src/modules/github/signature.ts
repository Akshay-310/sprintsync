import { createHmac, timingSafeEqual } from "node:crypto";

export function computeSignature(secret: string, rawBody: Buffer): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function isValidSignature(
  secret: string,
  rawBody: Buffer,
  header: string | undefined,
): boolean {
  if (!header) return false;
  const expected = Buffer.from(computeSignature(secret, rawBody));
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}