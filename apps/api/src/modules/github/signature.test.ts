import { describe, expect, it } from "vitest";
import { computeSignature, isValidSignature } from "./signature.js";

const secret = "test-secret";
const body = Buffer.from('{"action":"opened"}');

describe("isValidSignature", () => {
  it("accepts a correct signature", () => {
    expect(isValidSignature(secret, body, computeSignature(secret, body))).toBe(true);
  });
  it("rejects a signature made with a different secret", () => {
    expect(isValidSignature(secret, body, computeSignature("other", body))).toBe(false);
  });
  it("rejects a body that was changed after signing", () => {
    const header = computeSignature(secret, body);
    expect(isValidSignature(secret, Buffer.from('{"action":"closed"}'), header)).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(isValidSignature(secret, body, undefined)).toBe(false);
  });
  it("rejects a malformed header without throwing", () => {
    expect(isValidSignature(secret, body, "sha256=abc")).toBe(false);
  });
});