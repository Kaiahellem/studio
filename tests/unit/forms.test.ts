import { describe, expect, it } from "vitest";
import { answersFromFormData, displayAnswer, parseDefinition, validateAnswers } from "@/features/forms/schema";

const definition = parseDefinition({
  sections: [
    {
      title: "Om bedriften",
      fields: [
        { key: "what_you_do", label: "Hva gjør dere?", kind: "textarea", required: true },
        { key: "current_url", label: "Nettside", kind: "url" },
        { key: "launch_date", label: "Lansering", kind: "date" },
        { key: "show_prices", label: "Priser?", kind: "select", options: ["Ja", "Nei"] },
        { key: "owner", label: "Eier", kind: "select", options: [{ value: "client", label: "Vi" }, { value: "studio", label: "Studioet" }] },
        { key: "contact", label: "Kontakt", kind: "multiselect", options: ["Telefon", "E-post"] },
        { key: "newsletter", label: "Nyhetsbrev", kind: "boolean" },
      ],
    },
  ],
});

function fd(entries: [string, string][]) {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

describe("answersFromFormData", () => {
  it("reads only defined fields, trims text and keeps multiselect as a list", () => {
    const answers = answersFromFormData(
      definition,
      fd([
        ["what_you_do", "  Rør  "],
        ["contact", "Telefon"],
        ["contact", "E-post"],
        ["contact", "Hacket"],
        ["newsletter", "on"],
        ["is_admin", "true"],
      ]),
    );
    expect(answers).toEqual({
      what_you_do: "Rør",
      current_url: null,
      launch_date: null,
      show_prices: null,
      owner: null,
      contact: ["Telefon", "E-post"],
      newsletter: true,
    });
  });
});

describe("validateAnswers", () => {
  it("requires required fields", () => {
    expect(validateAnswers(definition, { what_you_do: null })).toHaveProperty("what_you_do");
  });

  it("checks urls, dates and options", () => {
    const errors = validateAnswers(definition, {
      what_you_do: "Rør",
      current_url: "javascript:alert(1)",
      launch_date: "neste vår",
      show_prices: "Kanskje",
    });
    expect(Object.keys(errors).sort()).toEqual(["current_url", "launch_date", "show_prices"]);
  });

  it("accepts valid answers", () => {
    expect(
      validateAnswers(definition, {
        what_you_do: "Rør",
        current_url: "https://fjordlys.no",
        launch_date: "2027-03-01",
        show_prices: "Ja",
        owner: "studio",
      }),
    ).toEqual({});
  });
});

describe("displayAnswer", () => {
  const field = (key: string) => definition.sections[0].fields.find((f) => f.key === key)!;
  it("shows option labels, lists and yes/no", () => {
    expect(displayAnswer(field("owner"), "studio")).toBe("Studioet");
    expect(displayAnswer(field("contact"), ["Telefon", "E-post"])).toBe("Telefon, E-post");
    expect(displayAnswer(field("newsletter"), true)).toBe("Ja");
    expect(displayAnswer(field("current_url"), null)).toBeNull();
  });
});
