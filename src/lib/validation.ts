import { z } from "zod";

// Mirrors the lightweight check the app used before zod (`/\S+@\S+\.\S+/`).
export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/** Required, trimmed email field. */
export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .regex(EMAIL_REGEX, "Enter a valid email");

/** Optional email: accepts a valid email or an empty string. */
export const optionalEmailField = z
  .string()
  .trim()
  .regex(EMAIL_REGEX, "Enter a valid email")
  .or(z.literal(""))
  .optional();
