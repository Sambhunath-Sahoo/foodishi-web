/**
 * The API base URL comes from the environment. Never hardcode it, and never
 * put a secret here — everything in this package ships to the browser.
 */
const DEFAULT_API_URL = "http://localhost:8000";

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured === undefined || configured.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_API_URL is not set. Point it at the Foodishi API before building for production.",
      );
    }
    return DEFAULT_API_URL;
  }
  return configured.replace(/\/+$/, "");
}
