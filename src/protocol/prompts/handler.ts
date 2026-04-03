import type { Prompt, GetPromptResult, PromptMessage } from "@modelcontextprotocol/sdk/types.js";
import { loadMetadata, findPromptById, loadPromptFile } from "./loader.js";
import { fillTemplate, validateRequiredVariables } from "./template.js";
import { invalidRequest } from "../../utils/mcp-error.js";

/**
 * Handle ListPrompts request — returns all available prompts with their arguments.
 */
export async function handleListPrompts(): Promise<{ prompts: Prompt[] }> {
  const metadata = await loadMetadata();

  const prompts: Prompt[] = metadata.map((prompt) => ({
    name: prompt.id,
    description: prompt.description,
    arguments: prompt.arguments.map((arg) => ({
      name: arg.name,
      description: arg.description,
      required: arg.required,
    })),
  }));

  return { prompts };
}

/**
 * Handle GetPrompt request — load template, validate args, substitute variables.
 */
export async function handleGetPrompt(
  name: string,
  args?: Record<string, string>,
): Promise<GetPromptResult> {
  const promptMeta = await findPromptById(name);
  if (!promptMeta) {
    throw invalidRequest(`Prompt not found: ${name}`);
  }

  const safeArgs = args ?? {};

  // Validate required arguments
  const requiredArgs = promptMeta.arguments.filter((a) => a.required).map((a) => a.name);
  const validation = validateRequiredVariables(safeArgs, requiredArgs);
  if (!validation.valid) {
    throw invalidRequest(`Missing required arguments: ${validation.missing.join(", ")}`);
  }

  // Load and fill template
  const template = await loadPromptFile(promptMeta.file);
  const filledPrompt = fillTemplate(template, safeArgs);

  const message: PromptMessage = {
    role: "user",
    content: { type: "text", text: filledPrompt },
  };

  return {
    description: promptMeta.description,
    messages: [message],
  };
}
