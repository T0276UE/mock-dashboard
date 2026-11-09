/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_API_BASE_URL?: string;
  readonly VITE_USE_BACKEND_SESSION?: string;
  readonly VITE_USE_BACKEND_CUSTOMER_ACCESS_FLOW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}