import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // pdf-parse v2 depends on @napi-rs/canvas and pdfjs-dist which include
  // native binaries and browser-only globals (DOMMatrix, Path2D, ImageData).
  // These packages must be excluded from Next.js bundling so they are loaded via
  // native Node.js require() at runtime instead of being inlined.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'pdfjs-dist'],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
