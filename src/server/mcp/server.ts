import {
	McpServer,
	type CallToolResult,
	type ServerContext,
} from "@modelcontextprotocol/server";
import { db } from "~/server/db";
import { getUserIdForAuthInfo } from "./auth";

const errorResult = (text: string): CallToolResult => ({
	content: [{ type: "text", text }],
	isError: true,
});

/**
 * Resolve the app user behind the request's access token. Tools must call
 * this and treat null as "not linked" (valid token, but the Keycloak user
 * never signed in to the web app).
 */
async function resolveUserId(ctx: ServerContext): Promise<string | null> {
	const authInfo = ctx.http?.authInfo;
	if (!authInfo) return null;
	return getUserIdForAuthInfo(authInfo);
}

const NOT_LINKED =
	"This token is valid but no SLR-Toolkit account is linked to it. " +
	"Sign in to the SLR-Toolkit web app once with the same Keycloak user, then retry.";

/**
 * Factory for the MCP server; createMcpHandler calls it once per request,
 * so registration cost stays low and no state may live on the instance.
 */
export function buildMcpServer(): McpServer {
	const server = new McpServer({
		name: "slr-toolkit",
		version: "0.1.0",
	});

	server.registerTool(
		"list-slrs",
		{
			title: "List SLRs",
			description:
				"List all systematic literature reviews (SLRs) the authenticated user owns or participates in, " +
				"with item and participant counts. Returns a JSON array.",
		},
		async (ctx) => {
			const userId = await resolveUserId(ctx);
			if (!userId) return errorResult(NOT_LINKED);

			const slrs = await db.sLR.findMany({
				where: {
					OR: [
						{ createdById: userId },
						{ participants: { some: { id: userId } } },
					],
				},
				include: {
					_count: { select: { items: true, participants: true } },
					createdBy: { select: { name: true } },
				},
				orderBy: { updatedAt: "desc" },
			});

			const result = slrs.map((slr) => ({
				id: slr.id,
				title: slr.title,
				description: slr.description,
				owner: slr.createdBy.name,
				ownedByCaller: slr.createdById === userId,
				itemCount: slr._count.items,
				participantCount: slr._count.participants,
				createdAt: slr.createdAt.toISOString(),
				updatedAt: slr.updatedAt.toISOString(),
			}));

			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	return server;
}
