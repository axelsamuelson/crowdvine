import * as jose from "jose";
import {
  auth0IssuerUrl,
  auth0JwksUrl,
  getAuth0Audience,
  getAuth0Domain,
} from "./mcp-auth-config";

let jwks: jose.JWTVerifyGetKey | null = null;

function getJwks(): jose.JWTVerifyGetKey {
  if (!jwks) {
    const domain = getAuth0Domain();
    jwks = jose.createRemoteJWKSet(new URL(auth0JwksUrl(domain)));
  }
  return jwks;
}

export type VerifiedMcpAccessToken = {
  sub: string;
  scopes: Set<string>;
  payload: jose.JWTPayload;
};

export async function verifyAuth0AccessToken(
  token: string,
): Promise<
  | { ok: true; token: VerifiedMcpAccessToken }
  | { ok: false; message: string }
> {
  try {
    const domain = getAuth0Domain();
    const audience = getAuth0Audience();
    const { payload } = await jose.jwtVerify(token, getJwks(), {
      issuer: auth0IssuerUrl(domain),
      audience,
      clockTolerance: 30,
    });

    const scopes = new Set<string>();
    if (typeof payload.scope === "string") {
      for (const s of payload.scope.split(/\s+/)) {
        if (s) scopes.add(s);
      }
    }
    if (Array.isArray(payload.permissions)) {
      for (const p of payload.permissions) {
        if (typeof p === "string") scopes.add(p);
      }
    }

    const sub = typeof payload.sub === "string" ? payload.sub : "unknown";
    return {
      ok: true,
      token: { sub, scopes, payload },
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
