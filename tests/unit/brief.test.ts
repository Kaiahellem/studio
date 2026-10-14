import { describe, expect, it } from "vitest";
import { buildBrief, type BriefData } from "@/features/brief/build";

const data: BriefData = {
  generatedAt: new Date("2026-10-14T12:00:00Z"),
  project: { name: "Ny nettside", status: "Aktiv", startDate: "2026-10-01", targetLaunch: "2027-01-15", stagingUrl: "https://ny.vercel.app", liveUrl: null, cmsUrl: null },
  client: { name: "Fjordlys Rørlegger AS", orgNumber: "923609016", email: "post@fjordlys.no", phone: "+4755123456", address: "Strandgaten 1, 5013 Bergen" },
  questionnaires: [
    {
      title: "Oppstartsskjema",
      status: "submitted",
      submittedAt: "2026-10-05T10:00:00Z",
      sections: [{ title: "Om bedriften", fields: [{ key: "about", label: "Hva gjør dere?", answer: "Rørlegger.\nSiden 1998." }, { key: "prices", label: "Vise priser?", answer: null }] }],
    },
    { title: "Domene og tilganger", status: "missing", submittedAt: null, sections: [] },
  ],
  site: { domain_name: "fjordlys.no", registrar: "Domeneshop", email_provider: null },
  brand: { colours: [{ name: "Fjordblå", hex: "#1F4E66" }], fonts: [{ name: "Fraunces", usage: "Overskrifter" }], links: [], contacts: [] },
  approvals: [
    {
      step: "Godkjenn struktur",
      rounds: [{ round: 1, openedAt: "2026-10-10T09:00:00Z", note: "Sidekart", link: "https://figma.com/x", decision: "changes_requested", comment: "Flytt priser opp" }],
    },
  ],
  analysis: null,
  files: [{ name: "logo.svg", step: "Last opp logo", sizeBytes: 2048, mimeType: "image/svg+xml", url: "https://signed.example/logo.svg?token=x" }],
  documents: [],
  linkDays: 7,
};

describe("project brief", () => {
  const md = buildBrief(data);

  it("has the client, the project and the answers", () => {
    expect(md).toContain("# Prosjektbrief: Ny nettside");
    expect(md).toContain("- **Org.nr.:** 923609016");
    expect(md).toContain("- **Testlenke:** https://ny.vercel.app");
    expect(md).toContain("- **Hva gjør dere?** Rørlegger.\n  Siden 1998.");
    expect(md).toContain("- **Vise priser?** –");
    expect(md).toContain("### Domene og tilganger\n\nIkke sendt inn ennå.");
  });

  it("has site details with labels, brand, approvals and files", () => {
    expect(md).toContain("- **Domenenavn:** fjordlys.no");
    expect(md.split("## Til agenten")[0]).not.toContain("email_provider"); // empty fields are left out of the prose
    expect(md).toContain("- Fjordblå: `#1F4E66`");
    expect(md).toContain("- **Endringer ønsket**: Flytt priser opp");
    expect(md).toContain("[logo.svg (2 kB, Last opp logo)](https://signed.example/logo.svg?token=x)");
    expect(md).toContain("Lenkene virker i 7 dager.");
    expect(md).toContain("Ingen ferdig analyse er koblet til prosjektet.");
  });

  it("ends with structured data the agent can read", () => {
    const json = JSON.parse(md.split("```json\n")[1].split("\n```")[0]);
    expect(json.client.orgNumber).toBe("923609016");
    expect(json.brand.colours[0].hex).toBe("#1F4E66");
    expect(json.answers["Oppstartsskjema"].about).toBe("Rørlegger.\nSiden 1998.");
  });
});
