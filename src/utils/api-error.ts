import { isAxiosError } from "axios";

// The backend's ApiError messages are written to be shown to the user
// directly (e.g. "This phone number already belongs to an active lead,
// owned by X"), not just logged - so any place that catches a failed API
// call should surface this instead of a generic fallback whenever the
// server actually sent one.
export function errorMessageFrom(err: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : fallback;
}

// validate-middleware.ts's own 422 response already carries this (zod's
// flattened fieldErrors, keyed by the exact schema field name) alongside the
// generic "Validation failed" message - callers that only read the message
// above throw this detail away. Returns undefined for anything else (a non-
// validation error, or one with no field-level detail).
export function fieldErrorsFrom(err: unknown): Record<string, string[]> | undefined {
  return isAxiosError<{ errors?: Record<string, string[]> }>(err) ? err.response?.data.errors : undefined;
}
