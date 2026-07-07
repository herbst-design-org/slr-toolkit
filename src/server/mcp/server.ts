import {
	McpServer,
	type CallToolResult,
	type ServerContext,
} from "@modelcontextprotocol/server";
// true zod 4 (aliased) — the SDK's schemas require its JSON Schema support,
// which the app's zod 3 does not provide
import * as z from "zod-v4";
import { db } from "~/server/db";
import { vdb } from "~/server/vdb";
import { getLink } from "~/server/api/routers/slr/classification";
import runSlrClassification from "~/server/api/routers/slr/runClassification";
import classifyAdhocText from "~/server/api/routers/slr/quickClassify";
import importBibtex from "~/server/api/routers/item/importBibtex";
import { fetchPdfFirstPageText } from "./pdf";
import { getUserIdForAuthInfo } from "./auth";

const RELEVANCE = z.enum(["RELEVANT", "IRRELEVANT", "UNKNOWN"]);

const errorResult = (text: string): CallToolResult => ({
	content: [{ type: "text", text }],
	isError: true,
});

const jsonResult = (data: unknown): CallToolResult => ({
	content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

/** Turn thrown errors into isError results so agents can react to them. */
const safe = async (
	fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> => {
	try {
		return await fn();
	} catch (error) {
		return errorResult(error instanceof Error ? error.message : String(error));
	}
};

const NOT_LINKED =
	"This token is valid but no SLR-Toolkit account is linked to it. " +
	"Sign in to the SLR-Toolkit web app once with the same Keycloak user, then retry.";

const SLR_NOT_FOUND =
	"SLR not found (or the user has no access to it). Use list-slrs to see available SLRs.";

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

/** The SLR, if the user owns it or participates in it; null otherwise. */
async function findAccessibleSlr(slrId: string, userId: string) {
	return db.sLR.findFirst({
		where: {
			id: slrId,
			OR: [
				{ createdById: userId },
				{ participants: { some: { id: userId } } },
			],
		},
	});
}

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
		async (ctx) =>
			safe(async () => {
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

				return jsonResult(
					slrs.map((slr) => ({
						id: slr.id,
						title: slr.title,
						description: slr.description,
						owner: slr.createdBy.name,
						ownedByCaller: slr.createdById === userId,
						itemCount: slr._count.items,
						participantCount: slr._count.participants,
						createdAt: slr.createdAt.toISOString(),
						updatedAt: slr.updatedAt.toISOString(),
					})),
				);
			}),
	);

	server.registerTool(
		"get-items",
		{
			title: "Get items of an SLR",
			description:
				"List items of an SLR, optionally filtered by relevance label (RELEVANT / IRRELEVANT / UNKNOWN). " +
				"Each item includes title, authors, year, DOI, URL and a link — a zotero://select URI (containing " +
				"the Zotero item key) for Zotero items, or a doi.org URL for imported items.",
			inputSchema: z.object({
				slrId: z.string(),
				relevance: RELEVANCE.optional(),
				limit: z.number().int().min(1).max(500).default(100),
			}),
		},
		async ({ slrId, relevance, limit }, ctx) =>
			safe(async () => {
				const userId = await resolveUserId(ctx);
				if (!userId) return errorResult(NOT_LINKED);
				if (!(await findAccessibleSlr(slrId, userId)))
					return errorResult(SLR_NOT_FOUND);

				const items = await db.itemOnSLR.findMany({
					where: { slrId, relevant: relevance },
					take: limit,
					include: {
						item: {
							include: {
								collection: {
									include: {
										provider: {
											select: {
												type: true,
												libraryType: true,
												libraryId: true,
											},
										},
									},
								},
							},
						},
					},
				});

				return jsonResult(
					items.map(({ item, relevant, note }) => ({
						itemId: item.id,
						externalId: item.externalId,
						title: item.title,
						authors: item.authors,
						year: item.year,
						doi: item.doi,
						url: item.url,
						link: getLink(item),
						relevance: relevant,
						note: note || undefined,
					})),
				);
			}),
	);

	server.registerTool(
		"set-relevance",
		{
			title: "Set item relevance",
			description:
				"Label one or more items of an SLR as RELEVANT, IRRELEVANT or UNKNOWN. " +
				"Labeled items are the training examples for classification; UNKNOWN items are what gets classified.",
			inputSchema: z.object({
				slrId: z.string(),
				itemIds: z.array(z.string()).min(1),
				relevance: RELEVANCE,
			}),
		},
		async ({ slrId, itemIds, relevance }, ctx) =>
			safe(async () => {
				const userId = await resolveUserId(ctx);
				if (!userId) return errorResult(NOT_LINKED);
				if (!(await findAccessibleSlr(slrId, userId)))
					return errorResult(SLR_NOT_FOUND);

				const { count } = await db.itemOnSLR.updateMany({
					where: { slrId, itemId: { in: itemIds } },
					data: { relevant: relevance },
				});

				const skipped = itemIds.length - count;
				return jsonResult({
					updated: count,
					relevance,
					...(skipped > 0 && {
						warning: `${skipped} of ${itemIds.length} ids are not items of this SLR and were skipped`,
					}),
				});
			}),
	);

	server.registerTool(
		"classify-slr",
		{
			title: "Classify SLR items",
			description:
				"Run the relevance classifier for an SLR: a model is trained on the labeled (RELEVANT/IRRELEVANT) items " +
				"and predicts relevance for the UNKNOWN items — all of them, or only the given itemIds. " +
				"Missing embeddings are generated first, so the first run on a large SLR can take a while. " +
				"Returns predictions sorted by relevance probability (descending).",
			inputSchema: z.object({
				slrId: z.string(),
				itemIds: z
					.array(z.string())
					.optional()
					.describe("Restrict classification to these item ids; omit to classify all UNKNOWN items"),
			}),
		},
		async ({ slrId, itemIds }, ctx) =>
			safe(async () => {
				const userId = await resolveUserId(ctx);
				if (!userId) return errorResult(NOT_LINKED);
				if (!(await findAccessibleSlr(slrId, userId)))
					return errorResult(SLR_NOT_FOUND);

				const { classification, failedItems } = await runSlrClassification({
					db,
					vdb,
					slrId,
					userId,
					itemIdsToClassify: itemIds ?? [],
				});

				const predictions = classification
					.map((c) => ({
						itemId: c.id,
						title: c.title,
						link: c.link,
						predictedRelevant: c.prediction === 1,
						relevanceProbability: c.probabilities?.[1] ?? null,
					}))
					.sort(
						(a, b) =>
							(b.relevanceProbability ?? 0) - (a.relevanceProbability ?? 0),
					);

				return jsonResult({
					predictions,
					...(failedItems.length > 0 && {
						failedItems,
						failedItemsHint:
							"No embedding could be generated for these item ids (often missing/empty abstracts).",
					}),
				});
			}),
	);

	server.registerTool(
		"import-bibtex",
		{
			title: "Import BibTeX entries",
			description:
				"Create items from BibTeX entries. Entries are imported into a collection of the user's BibTeX " +
				"provider (created on demand) and can optionally be added to an SLR directly, with an initial " +
				"relevance label (e.g. RELEVANT to add known-good training examples). Re-importing the same entries " +
				"updates them instead of duplicating.",
			inputSchema: z.object({
				bibtex: z.string().describe("BibTeX source containing one or more entries"),
				collectionTitle: z.string().describe("Human-readable name of the target collection"),
				slrId: z
					.string()
					.optional()
					.describe("Also add the imported items to this SLR"),
				relevance: RELEVANCE.default("UNKNOWN").describe(
					"Initial relevance label when adding to the SLR",
				),
			}),
		},
		async ({ bibtex, collectionTitle, slrId, relevance }, ctx) =>
			safe(async () => {
				const userId = await resolveUserId(ctx);
				if (!userId) return errorResult(NOT_LINKED);
				if (slrId && !(await findAccessibleSlr(slrId, userId)))
					return errorResult(SLR_NOT_FOUND);

				const { collection, items } = await importBibtex({
					db,
					userId,
					bibtexData: bibtex,
					collectionExternalId: collectionTitle
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "-")
						.replace(/(^-|-$)/g, ""),
					collectionTitle,
				});

				if (slrId) {
					await Promise.all(
						items.map((item) =>
							db.itemOnSLR.upsert({
								where: { itemId_slrId: { itemId: item.id, slrId } },
								create: { itemId: item.id, slrId, relevant: relevance },
								update: { relevant: relevance },
							}),
						),
					);
				}

				return jsonResult({
					collection: { id: collection.id, title: collection.title },
					importedItems: items.map((i) => ({ itemId: i.id, title: i.title })),
					...(slrId && { addedToSlr: slrId, relevance }),
				});
			}),
	);

	server.registerTool(
		"quick-classify",
		{
			title: "Quick-classify text or a PDF",
			description:
				"Classify ad-hoc content against an SLR's labeled examples without storing anything. " +
				"Provide either `text` (e.g. a title + abstract) or `pdfUrl` — the PDF is downloaded server-side " +
				"and only its first page is extracted and classified, so the page text never enters the conversation. " +
				"Requires the SLR to have labeled, embedded items (run classify-slr once after labeling).",
			inputSchema: z.object({
				slrId: z.string(),
				text: z.string().optional().describe("Raw text to classify"),
				pdfUrl: z
					.string()
					.optional()
					.describe("http(s) URL of a PDF whose first page should be classified"),
			}),
		},
		async ({ slrId, text, pdfUrl }, ctx) =>
			safe(async () => {
				const userId = await resolveUserId(ctx);
				if (!userId) return errorResult(NOT_LINKED);
				if ((text ? 1 : 0) + (pdfUrl ? 1 : 0) !== 1)
					return errorResult("Provide exactly one of `text` or `pdfUrl`.");

				const input = text ?? (await fetchPdfFirstPageText(pdfUrl!));

				const result = await classifyAdhocText({
					db,
					vdb,
					slrId,
					userId,
					text: input,
				});

				return jsonResult({
					predictedRelevant: result.prediction === 1,
					relevanceProbability: result.probabilities?.[1] ?? null,
					trainedOnLabeledItems: result.trainedOn,
					...(pdfUrl && { source: `first page of ${pdfUrl}` }),
				});
			}),
	);

	return server;
}
