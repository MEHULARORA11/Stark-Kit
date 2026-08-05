import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName)

const envPath = path.join(dirName, '../../', '.env');
dotenv.config({ path: envPath })

/**
 * Generic env accessor. New providers (Anthropic, Gemini, etc.) should
 * read their own key via getEnv('ANTHROPIC_API_KEY') instead of adding
 * a new hardcoded field to `config` below every time.
 */
export function getEnv(key: string): string | undefined {
  return process.env[key];
}

// Kept for backward compatibility with existing call sites
// (OpenAIProvider falls back to config.OPENAI_API_KEY when no
// apiKey is passed into its constructor).
export const config = {
  OPENAI_API_KEY: getEnv('OPENAI_API_KEY'),
  MISTRAL_API_KEY: getEnv('MISTRAL_API_KEY'),
  ANTHROPIC_API_KEY: getEnv('ANTHROPIC_API_KEY'),
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),
}