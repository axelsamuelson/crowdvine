/**
 * One-shot GSC OAuth login (outside Cursor MCP).
 * Reads credentials from .cursor/mcp.json, opens browser, caches token to ~/.gsc-mcp/
 */
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const mcp = JSON.parse(
  readFileSync(new URL("../.cursor/mcp.json", import.meta.url), "utf8"),
);
const env = mcp.mcpServers.gsc.env;

process.env.GSC_OAUTH_CLIENT_ID = env.GSC_OAUTH_CLIENT_ID;
process.env.GSC_OAUTH_CLIENT_SECRET = env.GSC_OAUTH_CLIENT_SECRET;

const oauthPath =
  "/Users/axelsamuelson/.nvm/versions/node/v20.19.3/lib/node_modules/suganthan-gsc-mcp/dist/oauth.js";
const { authenticateWithOAuth } = require(oauthPath);

console.log("Starting GSC OAuth — browser should open shortly...");
console.log("If not, copy the auth URL from the output below.\n");

await authenticateWithOAuth();
console.log("\nDone. Token saved to ~/.gsc-mcp/oauth-token.json");
console.log("Restart GSC MCP in Cursor, then retry your query.");
