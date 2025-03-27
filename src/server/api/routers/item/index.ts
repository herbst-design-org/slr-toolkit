import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "./VectorProvider";
import { TRPCError } from "@trpc/server";

import { randomUUID } from "crypto";
import {
	ContentProvider,
	type SingleItem,
} from "../content/ContentProvider";
import { subtractList } from "~/lib/helpers/subtractList";
import { type Db } from "~/server/db";
import { Relevance } from "@prisma/client";

export const itemRouter = createTRPCRouter({
	getAll: protectedProcedure
		.input(z.object({
			search: z.string(),
			collectionId: z.string().optional()
		}))
		.query(async ({ input, ctx }) => {
			const { search, collectionId } = input

			console.log("here")
			const items = await ctx.db.item.findMany({
				where: {
					collection: {
						provider: {
							userId: ctx.session.user.id
						},
						externalId: {
							contains: collectionId,
							mode: 'insensitive'
						},
					},
					title: {
						contains: search,
						mode: 'insensitive'
					},
				},
				select: {
					id: true,
					title: true,
				},
				take: 1000

			})
			return items
		}),
	addManyToSLR: protectedProcedure
		.input(
			z.object({
				ids: z.string().array(),
				slrId: z.string(),
				relevance: z.nativeEnum(Relevance).default("UNKNOWN")
			})
		)
		.mutation(({ ctx, input }) => {

			const { ids, slrId, relevance } = input
			return Promise.all(ids.map((id) => {
				return ctx.db.itemOnSLR.upsert({
					where: {
						itemId_slrId: {
							itemId: id,
							slrId
						}
					},
					create: {
						itemId: id,
						slrId,
						relevant: relevance
					},
					update: { relevant: relevance }
				})
			}))
		}),
	createCollections: protectedProcedure
		.input(
			z.object({
				externalIds: z.string().array(),
				providerId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { externalIds, providerId } = input;
			console.log({ externalIds });

			const existingCollections = await ctx.db.collection.findMany({
				where: {
					providerId,
				},
				select: {
					externalId: true,
					isSynced: true,
				},
			});
			const existingCollectionsSynced = existingCollections
				.filter((c) => c.isSynced)
				.map((c) => c.externalId);

			const existingCollectionsNotSynced = existingCollections
				.filter((c) => !c.isSynced)
				.map((c) => c.externalId);

			console.log({ existingCollectionsNotSynced, existingCollectionsSynced });
			const nonExistingCollections = subtractList({
				subtract: existingCollections.map((c) => c.externalId),
				from: externalIds,
			});
			const removedCollections = subtractList({
				subtract: externalIds,
				from: existingCollectionsSynced,
			});
			const notReactivatedCollections = subtractList({
				subtract: externalIds,
				from: existingCollectionsNotSynced,
			});
			const reactivatedCollections = subtractList({
				subtract: notReactivatedCollections,
				from: existingCollectionsNotSynced,
			});
			const collectionsToCreatePromise = ctx.db.collection.createMany({
				data: nonExistingCollections.map((c) => {
					return { externalId: c, providerId };
				}),
			});
			const collectionsToStopSyncingPromise = ctx.db.collection.updateMany({
				where: {
					externalId: { in: removedCollections },
				},
				data: {
					isSynced: false,
				},
			});

			const collectionsToRestartSyncingPromise = ctx.db.collection.updateMany({
				where: {
					externalId: { in: reactivatedCollections },
				},
				data: {
					isSynced: true,
				},
			});

			const res = await Promise.all([
				collectionsToCreatePromise,
				collectionsToStopSyncingPromise,
				collectionsToRestartSyncingPromise,
			]);
			console.log({ res });
			return res;
		}),
	updateCollections: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const cpData = await ctx.db.contentProvider.findMany({
			where: { userId },
		});
		if (!cpData) return [];
		const requiredUpdatesTemp = await Promise.all(
			cpData.map(async (cp) => {
				const collectionsOfProvider = await ctx.db.collection.findMany({
					where: { providerId: cp.id, isSynced: true },
				});
				const contentProvider = new ContentProvider({
					...cp,
					providerType: cp.type,
				});
				return await Promise.all(
					collectionsOfProvider.map(async (col) => {
						const { items, lastModifiedVersion } = await contentProvider.update(
							{
								collectionId: col.externalId,
								lastSyncedVersion: col.lastSyncedVersion,
							},
						);
						if (lastModifiedVersion)
							await ctx.db.collection.update({
								where: { id: col.id },
								data: { lastSyncedVersion: lastModifiedVersion },
							});
						return items.map((i) => {
							return { ...i, collectionId: col.id };
						});
					}),
				);
			}),
		);
		const requiredUpdatesFlat = requiredUpdatesTemp.flat(2);
		const requiredUpdatesExternalIds = requiredUpdatesFlat.map((i) => i.key);

		// cases item does exist in db, item does not exist in db
		const itemIdsToUpdate = await ctx.db.item
			.findMany({
				where: { externalId: { in: requiredUpdatesExternalIds } },
			})
			.then((data) => data.map((i) => i.externalId));
		const itemIdsToCreate = subtractList({
			subtract: itemIdsToUpdate,
			from: requiredUpdatesExternalIds,
		});

		return await handleCreateAndUpdate({
			db: ctx.db,
			itemIdsToCreate,
			itemIdsToUpdate,
			data: requiredUpdatesFlat,
		});
	}),
});

const handleCreateAndUpdate = async ({
	db,
	itemIdsToUpdate,
	itemIdsToCreate,
	data,
}: {
	db: Db;
	itemIdsToUpdate: string[];
	itemIdsToCreate: string[];
	data: (SingleItem & { collectionId: string })[];
}) => {
	const updates = Promise.all(
		itemIdsToUpdate.map((itemId) => {
			const item = data.find((d) => d.key === itemId);
			if (!item) return;
			return db.item.update({
				where: {
					externalId_collectionId: {
						externalId: itemId,
						collectionId: item.collectionId,
					},
				},
				data: {
					title: item.data.title,
					abstract: item.data.abstractNote
				},
			});
		}),
	);
	const creations = Promise.all(
		itemIdsToCreate.map((itemId) => {
			const item = data.find((d) => d.key === itemId);
			if (!item) return;
			return db.item.create({
				data: {
					title: item.data.title,
					abstract: item.data.abstractNote,
					type: "BOOK",
					externalId: itemId,
					collectionId: item.collectionId,
				},
			});
		}),
	);
	return Promise.all([creations, updates]);
};
