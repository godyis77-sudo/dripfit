import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Max ~10MB base64 string
const base64Image = z.string().min(1).max(15_000_000);

export const AnalyzeBodySchema = z.object({
  frontPhoto: base64Image,
  sidePhoto: base64Image,
  heightCm: z.number().min(120).max(230),
  referenceObject: z.enum(["credit_card", "a4_paper", "phone", "none"]).optional().default("none"),
  fitPreference: z.enum(["fitted", "regular", "relaxed"]).optional().default("regular"),
});

export const AnalyzeSizeGuideSchema = z.object({
  sizeGuideImage: base64Image,
  measurements: z.object({
    shoulder: z.number().min(0).max(100),
    chest: z.number().min(0).max(200),
    waist: z.number().min(0).max(200),
    hips: z.number().min(0).max(200),
    inseam: z.number().min(0).max(120),
    height: z.number().min(0).max(300),
  }),
  brandName: z.string().max(200).optional(),
});

export const CreateCheckoutSchema = z.object({
  priceId: z.string().regex(/^price_[a-zA-Z0-9]+$/, "Invalid Stripe price ID"),
});

export const VirtualTryonSchema = z.object({
  userPhoto: base64Image,
  clothingPhoto: base64Image,
});

export function parseOrError<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
  return { success: false, error: `Validation failed: ${messages}` };
}
