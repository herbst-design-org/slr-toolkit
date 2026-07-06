import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { env } from "~/env";
import { db } from "~/server/db";

/**
 * The MCP endpoint is an OAuth resource server: it accepts access tokens
 * issued by the same Keycloak realm the web app logs in against and
 * validates them locally against the realm's JWKS.
 */
const jwks = createRemoteJWKSet(
	new URL(`${env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`),
);

/** Validate a Keycloak-issued JWT access token. Returns null when invalid. */
export async function verifyKeycloakToken(
	token: string,
): Promise<AuthInfo | null> {
	try {
		const { payload } = await jwtVerify(token, jwks, {
			issuer: env.KEYCLOAK_ISSUER,
		});
		if (!payload.sub) return null;
		return {
			token,
			clientId: typeof payload.azp === "string" ? payload.azp : "unknown",
			scopes:
				typeof payload.scope === "string" ? payload.scope.split(" ") : [],
			expiresAt: payload.exp,
			extra: { sub: payload.sub, email: payload.email },
		};
	} catch {
		return null;
	}
}

/**
 * Map a validated token to the app user. NextAuth's Prisma adapter stores the
 * Keycloak user id (the token's `sub`) as Account.providerAccountId, so a
 * user must have signed in to the web app at least once.
 */
export async function getUserIdForAuthInfo(
	authInfo: AuthInfo,
): Promise<string | null> {
	const sub = authInfo.extra?.sub;
	if (typeof sub !== "string") return null;
	const account = await db.account.findUnique({
		where: {
			provider_providerAccountId: {
				provider: "keycloak",
				providerAccountId: sub,
			},
		},
		select: { userId: true },
	});
	return account?.userId ?? null;
}

/**
 * Public origin of this deployment. AUTH_URL is authoritative behind a
 * reverse proxy; the request URL is the fallback for local development.
 */
export function appOrigin(request: Request): string {
	if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
	return new URL(request.url).origin;
}

/** RFC 9728 metadata location for the /api/mcp resource. */
export function resourceMetadataUrl(origin: string): string {
	return `${origin}/.well-known/oauth-protected-resource/api/mcp`;
}

/** 401 challenge that points MCP clients at the resource metadata (RFC 9728). */
export function unauthorizedResponse(request: Request): Response {
	return new Response(
		JSON.stringify({
			error: "invalid_token",
			error_description: "Missing or invalid access token",
		}),
		{
			status: 401,
			headers: {
				"Content-Type": "application/json",
				"WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl(appOrigin(request))}"`,
			},
		},
	);
}
