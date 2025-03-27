import { type Item, type PrismaClient } from "@prisma/client";
import { type Db } from "~/server/db";


export default async function createVectorsForItemsVP({ db, items, vpId, userId }: { db: Db, items: Item[], vpId: string, userId: string }) {

	return db.$transaction(async (tx) => {
		await Promise.all(items.map(i =>
			tx.itemVector.create({
				data: {
					itemId: i.id,
					providerId: vpId,
					embeddingId: "",
					isStale: true
				}
			})
		));
	},{timeout: 30000});
}


