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
  MAPBOX_ACCESS_TOKEN: z.string().min(1).optional(),
  MAPBOX_BASE_URL: z.string().url().optional(),
  EVENTBRITE_API_TOKEN: z.string().min(1).optional(),
  EVENTBRITE_BASE_URL: z.string().url().optional(),
  GUIDES_GOOGLE_API_KEY: z.string().min(1).optional(),
  GUIDES_GOOGLE_CX: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
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
