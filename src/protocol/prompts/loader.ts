import { readFile } from "node:fs/promises";
import { join, dirname, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { invalidRequest } from "../../utils/mcp-error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Root directory for prompt templates. */
const PROMPTS_DIR = resolve(__dirname, "../../../prompts");

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface PromptMetadata {
  id: string;
  name: string;
  description: string;
  file: string;
  arguments: PromptArgument[];
}

interface MetadataFile {
  prompts: PromptMetadata[];
}

const fileCache = new Map<string, string>();

/**
 * Load the prompt metadata registry.
 */
export async function loadMetadata(): Promise<PromptMetadata[]> {
  const metadataPath = join(PROMPTS_DIR, "metadata.json");
  const content = await readFile(metadataPath, "utf-8");
  const parsed = JSON.parse(content) as MetadataFile;
  return parsed.prompts;
}

/**
 * Find a prompt by its ID.
 */
export async function findPromptById(id: string): Promise<PromptMetadata | null> {
  const metadata = await loadMetadata();
  return metadata.find((p) => p.id === id) ?? null;
}

/**
 * Load a prompt template file with caching.
 */
export async function loadPromptFile(filepath: string): Promise<string> {
  const cached = fileCache.get(filepath);
  if (cached) return cached;

  const fullPath = validatePromptPath(filepath);
  const content = await readFile(fullPath, "utf-8");
  fileCache.set(filepath, content);
  return content;
}

/**
 * Clear the file cache (for testing).
 */
export function clearPromptCache(): void {
  fileCache.clear();
}

function validatePromptPath(filepath: string): string {
  if (filepath.includes("..") || isAbsolute(filepath)) {
    throw invalidRequest("Invalid file path: path traversal or absolute paths are not allowed");
  }

  const fullPath = resolve(PROMPTS_DIR, filepath);
  if (!fullPath.startsWith(PROMPTS_DIR)) {
    throw invalidRequest("Invalid file path: file must be within the prompts directory");
  }

  return fullPath;
}
