import "server-only";

export function getApiInternalUrl() {
  const configured = process.env.API_INTERNAL_URL?.trim();
  const value =
    configured ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");

  if (!value) {
    throw new Error("API_INTERNAL_URL is required in production");
  }

  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("API_INTERNAL_URL must use http or https");
  }

  return value.replace(/\/$/, "");
}
