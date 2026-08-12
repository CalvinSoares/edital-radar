interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly COLETA_SECRET: string;
  readonly RESEND_API_KEY?: string;
  readonly RESEND_MODE?: "real" | "dry-run";
  readonly EMAIL_REMETENTE?: string;
  readonly SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
