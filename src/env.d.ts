interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly COLETA_SECRET: string;
  readonly RESEND_API_KEY?: string;
  readonly RESEND_MODE?: "real" | "dry-run";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
