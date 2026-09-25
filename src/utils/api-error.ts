import { isAxiosError } from "axios";

// The backend's ApiError messages are written to be shown to the user
// directly (e.g. "This phone number already belongs to an active lead,
// owned by X"), not just logged - so any place that catches a failed API
// call should surface this instead of a generic fallback whenever the
// server actually sent one.
export function errorMessageFrom(err: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(err) && err.response?.data.message ? err.response.data.message : fallback;
}
