// Centralized runtime config.
//
// VITE_API_URL is baked in at build time (set it in your host's env vars — e.g.
// Render's static-site environment). It falls back to the local dev backend so
// `npm run dev` keeps working with no .env.
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, '')) || 'http://127.0.0.1:8000'

// WebSocket base derived from the API URL (http → ws, https → wss).
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws')
