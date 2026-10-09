import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/next-path";

describe("safeNextPath", () => {
  it.each([
    "/",
    "/p/123",
    "/p/123/steg/456?tab=kommentarer",
    "/studio/projects/1#steps",
  ])("allows %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    ["absolute URL", "https://evil.example/p/1"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["tab trick", "/\t/evil.example"],
    ["newline trick", "/\n/evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["relative path", "p/123"],
    ["empty", ""],
    ["not a string", 42],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//x", "/studio")).toBe("/studio");
  });
});
