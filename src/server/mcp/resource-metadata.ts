import { env } from "~/env";
import { appOrigin } from "./auth";

/**
 * RFC 9728 OAuth protected resource metadata for the MCP endpoint.
 * MCP clients follow the 401 challenge here, read `authorization_servers`,
 * and run their OAuth flow directly against Keycloak.
 */
export function resourceMetadataResponse(request: Request): Response {
	const origin = appOrigin(request);
	return Response.json(
		{
			resource: `${origin}/api/mcp`,
			authorization_servers: [env.KEYCLOAK_ISSUER],
			bearer_methods_supported: ["header"],
			scopes_supported: ["openid", "profile", "email"],
			resource_name: "SLR-Toolkit MCP",
		},
		{
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=3600",
			},
		},
	);
}
