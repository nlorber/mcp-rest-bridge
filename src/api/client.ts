import type { TokenManager } from "./auth/token-manager.js";
import type { Logger } from "../logger.js";

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/**
 * Auth-aware HTTP client that injects Bearer tokens into every request.
 * Uses the native fetch API (Node 22+).
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenManager: TokenManager;
  private readonly timeoutMs: number;
  private readonly logger: Logger;

  constructor(baseUrl: string, tokenManager: TokenManager, timeoutMs: number, logger: Logger) {
    this.baseUrl = baseUrl;
    this.tokenManager = tokenManager;
    this.timeoutMs = timeoutMs;
    this.logger = logger.child("http-client");
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, options);
  }

  async delete(path: string): Promise<void> {
    await this.send("DELETE", path);
  }

  private async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const response = await this.send(method, path, options);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async send(method: string, path: string, options?: RequestOptions): Promise<Response> {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const token = await this.tokenManager.getToken();
      const url = this.buildUrl(path, options?.params);

      this.logger.debug("HTTP request", { method, url, attempt });

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        if (attempt < maxRetries && !(error instanceof DOMException && error.name === "TimeoutError")) {
          this.logger.warn("HTTP request failed, retrying", { method, path, attempt, error: String(error) });
          await this.backoff(attempt);
          continue;
        }
        throw error;
      }

      if (response.status >= 500 && attempt < maxRetries) {
        this.logger.warn("HTTP 5xx, retrying", { method, path, status: response.status, attempt });
        await this.backoff(attempt);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        this.logger.error("HTTP request failed", {
          method,
          path,
          status: response.status,
        });
        throw new HttpError(response.status, body, method, path);
      }

      return response;
    }

    throw new Error(`Unreachable: exhausted ${maxRetries} retries`);
  }

  private backoff(attempt: number): Promise<void> {
    const ms = 100 * Math.pow(2, attempt);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}

/**
 * HTTP error with status code and response body for error mapping.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly method: string,
    public readonly path: string,
  ) {
    super(`HTTP ${status} ${method} ${path}: ${body}`);
    this.name = "HttpError";
  }
}
