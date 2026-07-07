import { randomUUID } from "crypto";
import { type Db } from "~/server/db";
import { ContentProvider } from "../content/ContentProvider";

/**
 * Import BibTeX entries into a (possibly new) collection of the user's
 * BIBTEX content provider. Items are upserted on (externalId, collectionId),
 * so re-importing the same entries updates instead of failing. Shared by
 * tRPC and MCP.
 */
export default async function importBibtex({ db, userId, bibtexData, collectionExternalId, collectionTitle }: {
	db: Db;
	userId: string;
	bibtexData: string;
	collectionExternalId: string;
	collectionTitle: string;
}) {
	let providerData = await db.contentProvider.findFirst({
		where: {
			type: "BIBTEX",
			userId,
		},
	});

	if (!providerData) {
		providerData = await db.contentProvider.create({
			data: {
				id: `cp_bibtex_${randomUUID()}`,
				name: "BibTeX Importer",
				type: "BIBTEX",
				userId,
				apiKey: "none",
			},
		});
	}

	const provider = new ContentProvider({
		...providerData,
		libraryId: collectionExternalId,
		providerType: providerData.type,
	});

	const parsedItems = await provider.load({ items: bibtexData });
	if (parsedItems.length === 0) {
		throw new Error("No entries could be parsed from the BibTeX input");
	}

	const collection = await db.collection.upsert({
		where: {
			externalId_providerId: {
				externalId: collectionExternalId,
				providerId: providerData.id,
			},
		},
		create: {
			externalId: collectionExternalId,
			title: collectionTitle,
			providerId: providerData.id,
			isSynced: false,
		},
		update: {},
	});

	const items = await Promise.all(
		parsedItems.map((item) =>
			db.item.upsert({
				where: {
					externalId_collectionId: {
						externalId: item.externalId,
						collectionId: collection.id,
					},
				},
				create: { ...item, collectionId: collection.id },
				update: { ...item, collectionId: collection.id },
			}),
		),
	);

	return { collection, items };
}
