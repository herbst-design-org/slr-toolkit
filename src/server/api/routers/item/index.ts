import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "./VectorProvider";
import { TRPCError } from "@trpc/server";

import { randomUUID } from "crypto";
import { ContentProvider, type SingleItem } from "../content/ContentProvider";
import { subtractList } from "~/lib/helpers/subtractList";
import { type Db } from "~/server/db";
import { Relevance } from "@prisma/client";

export const itemRouter = createTRPCRouter({
	getAll: protectedProcedure
		.input(
			z.object({
				search: z.string(),
				collectionId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { search, collectionId } = input;

			console.log("here");
			const items = await ctx.db.item.findMany({
				where: {
					collection: {
						provider: {
							userId: ctx.session.user.id,
						},
						externalId: {
							contains: collectionId,
							mode: "insensitive",
						},
					},
					title: {
						contains: search,
						mode: "insensitive",
					},
				},
				select: {
					id: true,
					title: true,
				},
				take: 5000,
			});
			return items;
		}),
	addManyToSLR: protectedProcedure
		.input(
			z.object({
				ids: z.string().array(),
				slrId: z.string(),
				relevance: z.nativeEnum(Relevance).default("UNKNOWN"),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { ids, slrId, relevance } = input;
			return Promise.all(
				ids.map((id) => {
					return ctx.db.itemOnSLR.upsert({
						where: {
							itemId_slrId: {
								itemId: id,
								slrId,
							},
						},
						create: {
							itemId: id,
							slrId,
							relevant: relevance,
						},
						update: { relevant: relevance },
					});
				}),
			);
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
		const results = await Promise.allSettled(
  cpData.map(async (cp) => {
    const collectionsOfProvider = await ctx.db.collection.findMany({
      where: { providerId: cp.id, isSynced: true },
    });
    const contentProvider = new ContentProvider({ ...cp, providerType: cp.type });

    // Return the items from this specific provider
    return await Promise.all(
      collectionsOfProvider.map(async (col) => {
        const { items } = await contentProvider.update({
          collectionId: col.externalId,
          lastSyncedVersion: col.lastSyncedVersion,
        });
        return items.map((i) => ({ ...i, collectionId: col.id }));
      })
    );
  })
);
    const requiredUpdatesFlat = results
  .flatMap((result) => {
    // Check if THIS specific promise succeeded
    if (result.status === "fulfilled") {
      // result.value is the array of arrays from the inner Promise.all
      return result.value.flat(); 
    } else {
      // Log the error so you know WHY it failed
      console.error("A provider failed to sync:", result.reason);
      return []; // Return empty array for failed providers to keep .flatMap happy
    }
  });

// Now this will work perfectly
const requiredUpdatesExternalIds = requiredUpdatesFlat.map((i) => i.key);

    console.log("\n\n\n\n\n\n2\n\n\n\n\n\n")
		// cases item does exist in db, item does not exist in db
		const itemIdsToUpdate = await ctx.db.item
			.findMany({
				where: {
					externalId: { in: requiredUpdatesExternalIds },
					collection: { provider: { userId } },
				},
			})
			.then((data) => data.map((i) => i.externalId));
    console.log("\n\n\n\n\n\n 3 \n\n\n\n\n\n")
		const itemIdsToCreate = subtractList({
			subtract: itemIdsToUpdate,
			from: requiredUpdatesExternalIds,
		});
    console.log({ itemIdsToCreate, itemIdsToUpdate, total: requiredUpdatesExternalIds.length })

		return await handleCreateAndUpdate({
			db: ctx.db,
			itemIdsToCreate,
			itemIdsToUpdate,
			data: requiredUpdatesFlat,
		});
	}),
	updateRelevancy: protectedProcedure
		.input(
			z.object({
				itemId: z.string(),
				slrId: z.string(),
				relevancy: z.nativeEnum(Relevance),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { itemId, slrId, relevancy } = input;
			return await ctx.db.itemOnSLR.update({
				where: {
					itemId_slrId: {
						itemId,
						slrId,
					},
				},
				data: {
					relevant: relevancy,
				},
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
  console.log({data})
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
					abstract: item.data.abstractNote,
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
					title: item.data.title ?? "unknown",
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
