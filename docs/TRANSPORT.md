# Transport Guide

mcp-rest-bridge supports two transport modes for MCP communication.

## Stdio Transport (Default)

```
MCP_TRANSPORT=stdio  (or unset)
```

**How it works**: Communication happens over stdin/stdout. The MCP server reads JSON-RPC messages from stdin and writes responses to stdout. All logging goes to stderr to avoid interference.

**When to use**:
- Claude Desktop
- Claude Code
- Any MCP client that launches the server as a subprocess

**Configuration** (Claude Desktop `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "rest-bridge": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/path/to/mcp-rest-bridge"
    }
  }
}
```

## HTTP Transport

```
MCP_TRANSPORT=http
MCP_HTTP_PORT=3456  (default)
```

**How it works**: An Express HTTP server listens on the configured port. Clients send requests to `/mcp`. Sessions are managed via the `mcp-session-id` header.

**Session management**:
1. First request: no `mcp-session-id` header → server creates a new session and returns the ID
2. Subsequent requests: include `mcp-session-id` header → server routes to the existing session
3. Sessions are cleaned up automatically when the transport closes

**Session limits & hardening**:
- **Cap**: the server holds at most `maxSessions` concurrent sessions (default 1000); once reached, new sessions are rejected with HTTP 503.
- **Idle eviction**: sessions inactive for longer than the idle timeout (default 30 min) are swept and closed automatically.
- **Trust proxy**: set the `trustProxy` option when running behind a reverse proxy so per-IP rate limiting sees the real client IP. Enable `requireTrustProxy` to fail-closed (refuse to start) if it is unset.

**Authentication**: The HTTP transport is **not itself authenticated** — anyone who can reach `/mcp` drives the bridge with full tool access (it is protected only by the rate limiter). This is by design: stdio is the primary, process-trusted transport, and the HTTP transport assumes a **trusted network** with authentication and TLS terminated at a reverse proxy (the same proxy that supplies `trustProxy`). Do not expose it directly to untrusted clients. To authenticate it yourself, put it behind a proxy that enforces auth, or add a bearer-token check in the Express app ahead of the `app.all("/mcp", …)` handler in `src/transport/http.ts`, next to the rate limiter. This inbound transport auth is distinct from the *upstream* API credential the bridge manages (see [SECURITY.md](SECURITY.md#layer-5-credential-security) Layer 5).

**When to use**:
- Web-based MCP clients
- Multi-session scenarios (multiple users/agents)
- Remote MCP server deployment

**Health check**:
```bash
curl http://localhost:3456/health
# {"status":"ok","sessions":0}
```

## Choosing a Transport

| Factor | Stdio | HTTP |
|--------|-------|------|
| Setup complexity | Low (just run) | Medium (network config) |
| Multi-session | No | Yes |
| Remote access | No | Yes |
| Claude Desktop | Yes | No |
| Claude Code | Yes | Via config |
| Web clients | No | Yes |
| Security | Process isolation | Needs network security |

For development and Claude Desktop/Code, use stdio. For production deployment with multiple clients, use HTTP.

## TLS / HTTPS

The HTTP transport runs plain HTTP. For production deployments, terminate TLS at a reverse proxy (nginx, Caddy, cloud load balancer) rather than in the MCP server itself. This keeps cert management, renewal, and configuration out of the application layer.
