// Single source of truth for the API base URL.
// Imported by both lib/api.ts and contexts/AuthContext.tsx (kept in its own
// module to avoid a circular import between those two files).
export const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:9996").replace(
  /\/$/,
  ""
);
