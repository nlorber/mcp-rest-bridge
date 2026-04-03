/**
 * Substitute {{variable}} placeholders in a template string.
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = processConditionals(template, variables);
  result = substituteVariables(result, variables);
  result = cleanupWhitespace(result);
  return result.trim();
}

/**
 * Validate that all required variables are present and non-empty.
 */
export function validateRequiredVariables(
  variables: Record<string, string>,
  required: string[],
): { valid: boolean; missing: string[] } {
  const missing = required.filter((name) => {
    const value = variables[name];
    return !value || value.trim() === "";
  });
  return { valid: missing.length === 0, missing };
}

/**
 * Extract all variable names from a template (both simple and conditional).
 */
export function extractVariableNames(template: string): string[] {
  const names = new Set<string>();

  // Simple variables: {{variable}}
  for (const match of template.matchAll(/\{\{(\w+)\}\}/g)) {
    names.add(match[1]);
  }

  // Conditional variables: {{#if variable}}
  for (const match of template.matchAll(/\{\{#if (\w+)\}\}/g)) {
    names.add(match[1]);
  }

  return Array.from(names);
}

function substituteVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    return variables[varName] ?? "";
  });
}

function processConditionals(template: string, variables: Record<string, string>): string {
  return template.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName: string, content: string) => {
      const value = variables[varName];
      return value && value.trim() !== "" ? content : "";
    },
  );
}

function cleanupWhitespace(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}
