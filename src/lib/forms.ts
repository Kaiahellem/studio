import { z } from "zod";

// Helpers for reading FormData with zod. Empty form fields arrive as "", which should mean "not set".

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .catch(null);

export const requiredText = (message: string, max = 200) => z.string({ error: message }).trim().min(1, message).max(max);

export const optionalUrl = (message: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), message);

export const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v));

export const uuid = z.uuid();

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
  .transform((v) => v === "on" || v === "true");

// FormData → plain object; missing fields become null, so optional schemas see them.
export function formObject(formData: FormData, keys: readonly string[]): Record<string, FormDataEntryValue | null> {
  return Object.fromEntries(keys.map((k) => [k, formData.get(k)]));
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ugyldig verdi.";
}
