import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    KEYCLOAK_ID: z.string(),
    KEYCLOAK_SECRET: z.string(),
    KEYCLOAK_ISSUER: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DEFAULT_VECTORPROVIDER_URL: z.string().url(),
    DEFAULT_VECTORPROVIDER_SECRET: z.string(),
    QDRANT_URL: z.string().url(),
    QDRANT_SECRET: z.string(),
    QDRANT_PORT: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    KEYCLOAK_ID: process.env.KEYCLOAK_ID,
    KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    DEFAULT_VECTORPROVIDER_URL: process.env.DEFAULT_VECTORPROVIDER_URL,
    DEFAULT_VECTORPROVIDER_SECRET: process.env.DEFAULT_VECTORPROVIDER_SECRET,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_SECRET: process.env.QDRANT_SECRET,
    QDRANT_PORT: process.env.QDRANT_PORT,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
