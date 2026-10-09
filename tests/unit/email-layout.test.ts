import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/email/layout";

describe("renderEmail", () => {
  const email = renderEmail({
    heading: "Det er din tur",
    lines: ['«Last opp logo» venter på deg <script>alert("x")</script>'],
    list: ["Logo", "Tekster"],
    button: { label: "Åpne", url: "https://portal.no/p/1?a=1&b=2" },
    footer: "Fotnote",
  });

  it("escapes everything that came from data", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain('href="https://portal.no/p/1?a=1&amp;b=2"');
  });

  it("has a plain-text version with the link written out", () => {
    expect(email.text).toContain("Det er din tur");
    expect(email.text).toContain("– Logo");
    expect(email.text).toContain("Åpne: https://portal.no/p/1?a=1&b=2");
  });

  it("declares Norwegian for screen readers", () => {
    expect(email.html).toContain('<html lang="nb">');
  });
});
