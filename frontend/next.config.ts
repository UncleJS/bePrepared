import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  experimental: {
    // Run middleware on Node.js instead of the Edge Runtime.
    // Required because next-auth v5 uses jose JWT ops that call new Function(),
    // which is banned in the V8 Edge isolate (EvalError).
    nodeMiddleware: true,
  },
};

export default nextConfig;
