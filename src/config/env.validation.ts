import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production', 'staging'])
    .optional()
    .default('development'),
  PORT: z.coerce.number().positive().max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must be provided').optional(),
  REDIS_URL: z.string().min(1, 'REDIS_URL must be provided').optional(),
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_BASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).optional(),
  EXTERNAL_API_MAX_RETRIES: z.coerce.number().int().min(0).optional(),
  EXTERNAL_API_RETRY_DELAY_MS: z.coerce.number().int().positive().optional(),
  MAPBOX_ACCESS_TOKEN: z.string().min(1).optional(),
  MAPBOX_BASE_URL: z.string().url().optional(),
  EVENTBRITE_API_TOKEN: z.string().min(1).optional(),
  EVENTBRITE_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://www.eventbriteapi.com/v3'),
  EVENTBRITE_CLIENT_ID: z.string().min(1).optional(),
  EVENTBRITE_CLIENT_SECRET: z.string().min(1).optional(),
  EVENTBRITE_AUTH_URL: z
    .string()
    .url()
    .optional()
    .default('https://www.eventbrite.com/oauth/authorize'),
  EVENTBRITE_TOKEN_URL: z
    .string()
    .url()
    .optional()
    .default('https://www.eventbrite.com/oauth/token'),
  EVENTBRITE_REDIRECT_URI: z.string().url().optional(),
  EVENTBRITE_SUCCESS_REDIRECT: z
    .string()
    .optional()
    .default('/settings/integrations?eventbrite=connected'),
  EVENTBRITE_FAILURE_REDIRECT: z
    .string()
    .optional()
    .default('/settings/integrations?eventbrite=error'),
  TRAVEL_ADVISOR_API_KEY: z.string().min(1).optional(),
  TRAVEL_ADVISOR_API_HOST: z
    .string()
    .min(1)
    .optional()
    .default('travel-advisor.p.rapidapi.com'),
  TRAVEL_ADVISOR_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://travel-advisor.p.rapidapi.com'),
  GUIDES_GOOGLE_API_KEY: z.string().min(1).optional(),
  GUIDES_GOOGLE_CX: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z
    .string()
    .min(1, 'GOOGLE_CLIENT_ID is required')
    .default('local-google-client-id'),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1, 'GOOGLE_CLIENT_SECRET is required')
    .default('local-google-client-secret'),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url('GOOGLE_REDIRECT_URI must be a valid URL')
    .default('http://localhost:3000/api/auth/google/callback'),
  APP_SESSION_SECRET: z
    .string()
    .min(32, 'APP_SESSION_SECRET must be at least 32 characters')
    .default('local-development-session-secret-please-change-me'),
  FRONTEND_ORIGIN: z
    .string()
    .url('FRONTEND_ORIGIN must be a valid URL')
    .default('http://localhost:5173'),
  FRONTEND_EXTRA_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvSchema => {
  const { success, data, error } = envSchema.safeParse(config);

  if (!success) {
    const formatted = error.issues
      .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return data;
};
