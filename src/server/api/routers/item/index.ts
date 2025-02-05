import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "./VectorProvider";
import { TRPCError } from "@trpc/server";

import { randomUUID } from "crypto";
import { ContentProvider } from "../content/ContentProvider";

export const itemRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				title: z.string(),
				abstract: z.string(),
				contentProviderId: z.string(),
				slrId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { abstract, title, contentProviderId, slrId } = input;
			const slr = await ctx.db.sLR.findUnique({
				where: {
					id: slrId,
				},
				include: {
					defaultVectorProvider: true,
				},
			});

			if (!slr)
				throw new TRPCError({ message: "Invalid SLR id", code: "BAD_REQUEST" });
			const vpd = slr.defaultVectorProvider;
			const { url, apiKey, id: vectorProviderId } = vpd;

			const vectorProvider = new VectorProvider({ url, apiKey, model: "x" });
			const embedding = await vectorProvider.generateEmbedding(abstract);
			if (!embedding)
				throw new TRPCError({
					message: "Unable to create Embedding",
					code: "INTERNAL_SERVER_ERROR",
				});

			const randomEmbeddingId = randomUUID();
			const vectorStoreResponse = await ctx.vdb.upsert(slr.id, {
				wait: true,
				points: [
					{
						id: randomEmbeddingId,
						vector: embedding,
					},
				],
			});

			const item = ctx.db.item.create({
				data: {
					abstract,
					title,
					type: "BOOK",
					collectionId: "xyz",
					slrId,
					vectors: {
						create: {
							embeddingId: randomEmbeddingId,
							providerId: vectorProviderId,
						},
					},
				},
			});
			return item;
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
			return ctx.db.collection.createMany({
				data: externalIds.map((c) => {
					return { externalId: c, providerId };
				}),
			});
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
						return items;
					}),
				);
			}),
		);
		const requiredUpdatesFlat = requiredUpdatesTemp.flat(2);
		// cases item does exist in db, item does not exist in db
		const itemsInDb = await ctx.db.item.findMany({
where: { externalId: { in: requiredUpdatesFlat.map((i) => i.key) } },}
		);
		return requiredUpdatesFlat;
	}),
});
