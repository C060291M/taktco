// Configured only, not implemented - see README §5.
// TAKTCO's live AI features (Marketing AI, TAKTCO AI) currently call the
// Anthropic API directly via src/lib/ai.ts, which is real, working code.
// This file is scaffolding only, in case a future feature specifically
// wants OpenAI (e.g. a different model for a specific task) - it does not
// replace the existing Anthropic integration.

// import OpenAI from "openai";
// export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
