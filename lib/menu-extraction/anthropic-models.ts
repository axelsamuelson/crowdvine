/**
 * Default models for menu extraction (Actor / Critic).
 * Override with MENU_EXTRACTION_MODEL / MENU_EXTRACTION_CRITIC_MODEL.
 */

export const ACTOR_MODEL_PRIMARY =
  process.env.MENU_EXTRACTION_MODEL || "claude-haiku-4-5-20251001";

export const ACTOR_MODEL_FALLBACK = "claude-sonnet-4-6";

/** Backward compat: batch.ts and callers expecting MODEL_ID. */
export const MODEL_ID = ACTOR_MODEL_PRIMARY;
