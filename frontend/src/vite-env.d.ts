/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FoundrBase backend API (e.g. https://foundrbase-api.onrender.com). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
