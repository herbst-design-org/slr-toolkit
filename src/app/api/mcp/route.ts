import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildMcpServer } from "~/server/mcp/server";
import {
	unauthorizedResponse,
	verifyKeycloakToken,
} from "~/server/mcp/auth";

/**
 * MCP endpoint (Streamable HTTP, stateless). Protected by Keycloak-issued
 * bearer tokens; unauthenticated requests receive a 401 whose
 * WWW-Authenticate header points clients at the OAuth resource metadata.
 */
const handler = createMcpHandler(buildMcpServer);

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
	"Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

async function handleRequest(request: Request): Promise<Response> {
	const token = /^Bearer (.+)$/i.exec(
		request.headers.get("authorization") ?? "",
	)?.[1];
	const authInfo = token ? await verifyKeycloakToken(token) : null;

	const response = authInfo
		? await handler.fetch(request, { authInfo })
		: unauthorizedResponse(request);

	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		response.headers.set(key, value);
	}
	return response;
}

function handleOptions(): Response {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export {
	handleRequest as GET,
	handleRequest as POST,
	handleRequest as DELETE,
	handleOptions as OPTIONS,
};
