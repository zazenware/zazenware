// =============================================================
// backend/src/config/env.js — Zazenware MVP1
// Validates required environment variables at boot.
// Var names match the actual .env / Railway Variables exactly.
// =============================================================

const REQUIRED = [
  'DATABASE_URL',
  'CORS_ORIGIN',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'PAYMENTS_EMAIL',
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('[env] Missing required environment variables:');
  missing.forEach((key) => console.error(`  - ${key}`));
  process.exit(1);
}

export const env = {
  nodeEnv:          process.env.NODE_ENV    || 'development',
  port:             parseInt(process.env.PORT, 10) || 4000,
  databaseUrl:      process.env.DATABASE_URL,
  corsOrigins:      (process.env.CORS_ORIGIN || '')
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
  resendApiKey:     process.env.RESEND_API_KEY,
  fromEmail:        process.env.FROM_EMAIL,
  replyToEmail:     process.env.REPLY_TO_EMAIL  || process.env.FROM_EMAIL,
  bccEmail:         process.env.BCC_EMAIL        || '',
  paymentsEmail:    process.env.PAYMENTS_EMAIL,
  contactEmail:     process.env.CONTACT_EMAIL    || '',
  siteUrl:          process.env.SITE_URL          || 'http://localhost:5173',
  isDev:            (process.env.NODE_ENV || 'development') === 'development',
  isProd:           process.env.NODE_ENV === 'production',
};