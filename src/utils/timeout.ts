/**
 * Error thrown when a tool execution exceeds its timeout.
 */
export class TimeoutError extends Error {
  constructor(operationName: string, timeoutMs: number) {
    super(`Operation '${operationName}' timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Wrap a promise with a timeout. Rejects with TimeoutError if the
 * promise does not resolve within the given duration.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  let timerId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timerId = setTimeout(() => reject(new TimeoutError(operationName, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

/**
 * Per-tool timeout overrides. Tools not listed here use the default.
 */
const TOOL_TIMEOUTS: Record<string, number> = {
  // Heavy tools can get longer timeouts
  // e.g. "generate_report": 120_000,
};

/**
 * Get the timeout for a specific tool, falling back to the default.
 */
export function getToolTimeout(toolName: string, defaultMs: number): number {
  return TOOL_TIMEOUTS[toolName] ?? defaultMs;
}
