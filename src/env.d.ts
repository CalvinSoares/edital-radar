interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly COLETA_SECRET: string;
  readonly RESEND_API_KEY?: string;
  readonly RESEND_MODE?: "real" | "dry-run";
  readonly RESEND_WEBHOOK_SECRET?: string;
  readonly EMAIL_REMETENTE?: string;
  readonly SITE_URL?: string;
  /** Destinatário interno do alarme do job (0 pubs em dia útil, falhas). */
  readonly ALARME_EMAIL?: string;
  /** Senha do backoffice interno (/admin). Sem ela, admin fica desligado. */
  readonly ADMIN_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
