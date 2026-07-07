import { type Db } from "~/server/db";
import { type VdbClient } from "~/server/vdb";
import { env } from "~/env";
import { VectorProvider } from "../item/VectorProvider";
import prepareVectorsForClassification from "./prepareVectorsForClassification";
import classify from "./classification";

export class SlrNotFoundError extends Error {
	constructor() {
		super("SLR not found or not accessible");
	}
}

/**
 * Resolve the SLR's vector provider, enforcing owner/participant access.
 * Falls back to the env default model for providers created before
 * DEFAULT_VECTORPROVIDER_MODEL existed.
 */
export async function resolveVectorProvider({ db, vdb, slrId, userId }: { db: Db; vdb: VdbClient; slrId: string; userId: string }) {
	const vpData = await db.sLR.findUnique({
		where: {
			id: slrId,
			OR: [
				{ createdById: userId },
				{ participants: { some: { id: userId } } },
			],
		},
		include: { defaultVectorProvider: true },
	}).then((slr) => slr?.defaultVectorProvider)
	if (!vpData) throw new SlrNotFoundError()
	const vp = new VectorProvider({
		...vpData,
		model: vpData.model || env.DEFAULT_VECTORPROVIDER_MODEL || "",
		vdb,
	})
	return { vp, vpData }
}

/**
 * Full classification run for an SLR: ensure embeddings exist, train on the
 * labeled items, classify the given items (or, with an empty list, all
 * UNKNOWN items), and persist the results. Shared by tRPC and MCP.
 */
export default async function runSlrClassification({ db, vdb, slrId, userId, itemIdsToClassify }: {
	db: Db;
	vdb: VdbClient;
	slrId: string;
	userId: string;
	itemIdsToClassify: string[];
}) {
	const isCustomSelection = itemIdsToClassify.length > 0
	const { vp, vpData } = await resolveVectorProvider({ db, vdb, slrId, userId })

	const itemIdsDefault = await db.item.findMany({
		where: {
			slr: {
				some: (isCustomSelection ? { slrId, relevant: { not: "UNKNOWN" } } : { slrId })
			}
		},
		select: {
			id: true
		}
	}).then(d => d.map(i => i.id))

	const itemIds = [...itemIdsDefault, ...itemIdsToClassify]

	const { failedItems } = await prepareVectorsForClassification({
		db,
		vpData,
		vp,
		itemIds,
		userId
	})

	const itemIdsToClassifyFiltered = itemIdsToClassify.filter(id => !failedItems.includes(id))

	const classification = await classify({
		vdb,
		vpId: vpData.id,
		db,
		itemIds: [...itemIdsDefault, ...itemIdsToClassifyFiltered],
		slrId,
		userId
	})

	const BATCH_SIZE = 200;

	for (let i = 0; i < classification.length; i += BATCH_SIZE) {
		const batch = classification.slice(i, i + BATCH_SIZE);

		await Promise.all(batch.map(classification =>
			db.itemOnSLR.update({
				where: {
					itemId_slrId: {
						itemId: classification.id,
						slrId
					}
				},
				data: {
					classifications: {
						create: {
							prediction: classification.prediction?.toString() ?? "unknown",
							probabilities: {
								createMany: {
									data: classification.probabilities!.map((prob, index) => ({
										label: index.toString(),
										probability: prob
									}))
								}
							}
						}
					}
				}
			})
		));
	}
	const failedItemsWithoutFiltered = itemIdsToClassify.length > 0 ? itemIdsToClassify.filter(id => failedItems.includes(id)) : failedItems

	return { classification, failedItems: failedItemsWithoutFiltered }
}
