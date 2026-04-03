import type { Logger } from "../../logger.js";

interface StoredToken {
  accessToken: string;
  createdAt: number;
  expiresIn: number;
}

interface Credentials {
  username: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Refresh token 5 minutes before expiry. */
const REFRESH_BUFFER_SECONDS = 300;

/**
 * Manages JWT token lifecycle: acquire, cache, auto-refresh, inflight dedup.
 */
export class TokenManager {
  private token: StoredToken | null = null;
  private inflight: Promise<string> | null = null;
  private credentials: Credentials;
  private readonly baseUrl: string;
  private readonly logger: Logger;

  constructor(baseUrl: string, credentials: Credentials, logger: Logger) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
    this.logger = logger.child("token-manager");
  }

  /**
   * Get a valid access token, refreshing if needed.
   * Deduplicates concurrent requests.
   */
  async getToken(): Promise<string> {
    if (this.token && !this.isExpiringSoon()) {
      return this.token.accessToken;
    }

    if (this.inflight) return this.inflight;

    this.inflight = this.authenticate().then(
      (token) => {
        this.inflight = null;
        return token;
      },
      (err) => {
        this.inflight = null;
        throw err;
      },
    );

    return this.inflight;
  }

  /**
   * Update credentials and force re-authentication on next request.
   */
  updateCredentials(username: string, password: string): void {
    this.credentials = { username, password };
    this.clearToken();
    this.logger.info("Credentials updated, token cleared");
  }

  /**
   * Clear the cached token.
   */
  clearToken(): void {
    this.token = null;
    this.inflight = null;
  }

  /**
   * Decode the JWT payload without verification (for extracting claims).
   */
  static decodePayload(token: string): Record<string, unknown> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    return JSON.parse(Buffer.from(parts[1], "base64url").toString()) as Record<string, unknown>;
  }

  private isExpiringSoon(): boolean {
    if (!this.token) return true;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.token.createdAt + this.token.expiresIn;
    return now >= expiresAt - REFRESH_BUFFER_SECONDS;
  }

  private async authenticate(): Promise<string> {
    const url = `${this.baseUrl}/auth/token`;
    this.logger.debug("Acquiring token", { url });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.credentials.username,
        password: this.credentials.password,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Authentication failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as TokenResponse;

    this.token = {
      accessToken: data.access_token,
      createdAt: Math.floor(Date.now() / 1000),
      expiresIn: data.expires_in,
    };

    this.logger.info("Token acquired", { expiresIn: data.expires_in });
    return this.token.accessToken;
  }
}
