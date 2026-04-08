import { protectedResourceMetadataUrlFromRequest } from "./resource-url";

function escapeParamValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * RFC 6750 WWW-Authenticate for Bearer tokens; includes RFC 9728 resource_metadata when requested.
 */
export function wwwAuthenticateBearer(opts: {
  error: "invalid_token" | "insufficient_scope";
  description: string;
  req: Request;
  includeResourceMetadata: boolean;
}): string {
  const parts = [
    `Bearer error="${opts.error}"`,
    `error_description="${escapeParamValue(opts.description)}"`,
  ];
  if (opts.includeResourceMetadata) {
    const url = protectedResourceMetadataUrlFromRequest(opts.req);
    parts.push(`resource_metadata="${escapeParamValue(url)}"`);
  }
  return parts.join(", ");
}
