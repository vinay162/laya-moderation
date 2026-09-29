/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Hugging Face Space, e.g. https://vinay57-laya-moderation-demo.hf.space */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
