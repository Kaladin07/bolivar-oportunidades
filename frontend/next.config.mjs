import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

function apiInternalUrl() {
  const configured = process.env.API_INTERNAL_URL?.trim();
  const value = configured || (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");
  if (!value) {
    throw new Error("API_INTERNAL_URL is required for production builds");
  }

  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("API_INTERNAL_URL must use http or https");
  }
  return value.replace(/\/$/, "");
}

const apiUrl = apiInternalUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  outputFileTracingRoot: path.join(projectDirectory, ".."),
  experimental: { cpus: 1, webpackBuildWorker: false },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
