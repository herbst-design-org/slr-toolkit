import type { VectorProvider } from "@prisma/client";
import createEmptyVectorForItemsVP from "./createVectorsForItemsVP"
import { type Db } from "~/server/db";
import { type VectorProvider as vpt } from "../item/VectorProvider";

// 1. item mit vektor für vp der nicht veraltet ist
// -> skip
// 2. item mit vektor für vp der veraltet ist
// -> get embedding id update that embedding
// 3. item ohne vektor für vp
// -> generate entry for vector in db, mark as stale
//
// Implementation:
// 1. get all items that do not have a vector for vp at all and generate one that isStale
// 2. get all items, filter out all that do NOT have stale vectors
// 3. handle all others in batch

export default async function prepareVectorsForClassification({ vpData, db, vp, itemIds, userId }: { vp: vpt, vpData: VectorProvider, db: Db, userId: string, itemIds: string[] }) {

	const itemsWithoutVectorForVP = await db.item.findMany({
		where: {
			id: { in: itemIds },
			NOT: [
				{
					vectors: {
						some: {
							providerId: vpData.id
						}
					}
				}
			]
		},
	})
	await createEmptyVectorForItemsVP({
		items: itemsWithoutVectorForVP,
		vpId: vpData.id,
		db,
		userId
	})
	const itemsWithStaleVectors = await db.item.findMany({
		where: {
			id: { in: itemIds },
			vectors: {
				some: {
					providerId: vpData.id,
					isStale: true
				},
			}
		},
		include: {
			vectors: {
				where: {
					providerId: vpData.id,
					isStale: true
				}
			},
		},
	})
	const vdbResponse = await vp.generateAndSaveEmbeddings({
		input: itemsWithStaleVectors,
		collectionId: vpData.id
	}).then(data => data.filter(d => !!d))



	return await db.itemVector.updateMany({
		where: {
			itemId: { in: vdbResponse.map(i => i.embeddingId) },
			providerId: vpData.id
		},
		data: {
			isStale: false
		}
	})
}

