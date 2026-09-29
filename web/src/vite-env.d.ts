/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Hugging Face Space that serves the model, e.g. Vinay57/laya-moderation-demo */
  readonly VITE_HF_SPACE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
