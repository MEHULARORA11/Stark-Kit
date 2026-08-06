import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName)

const envPath = path.join(dirName, '../../', '.env');
dotenv.config({ path: envPath })

// Retrieves the value of an environment variable.
export function getEnv(key: string): string | undefined {
  return process.env[key];
}

// Config object containing commonly used environment variables.
export const config = {
  OPENAI_API_KEY: getEnv('OPENAI_API_KEY'),
  MISTRAL_API_KEY: getEnv('MISTRAL_API_KEY'),
  ANTHROPIC_API_KEY: getEnv('ANTHROPIC_API_KEY'),
  GEMINI_API_KEY: getEnv('GEMINI_API_KEY'),
}