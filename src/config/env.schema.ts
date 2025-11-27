import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // API
  API_PREFIX: z.string().default('api'),
  API_VERSION: z.string().default('v1'),

  // WhatsApp
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_API_URL: z
    .string()
    .url()
    .default('https://graph.facebook.com/v21.0'),
  WHATSAPP_CATALOG_ID: z.string().optional(),

  // Meta App Secret (optional)
  META_APP_SECRET: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // WhatsApp Flow (at least one private key source must be provided)
  META_FLOW_PRIVATE_KEY_BASE64: z.string().optional(),
  META_FLOW_PRIVATE_KEY_PATH: z.string().optional(),
  META_FLOW_PRIVATE_KEY_PEM: z.string().optional(),
  META_FLOW_PRIVATE_KEY_PASSPHRASE: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
});

export type Env = z.infer<typeof envSchema>;
