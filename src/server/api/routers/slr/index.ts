import { Relevance } from "@prisma/client";
import prepareVectorsForClassification from "./prepareVectorsForClassification";
import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "../item/VectorProvider";
import classify from "./classification";
import { TRPCError } from "@trpc/server";
import { assertSlrAccess } from "~/server/api/authz";

export const slrRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				title: z.string(),
				vectorProviderId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			let { vectorProviderId } = input;
			if (vectorProviderId === "default") {
				let defaultVectorProvider = await ctx.db.vectorProvider.findFirst({
					where: { userId, name: "Default Provider" },
				});
				if (!defaultVectorProvider) {
					// The qdrant call cannot participate in a db transaction, so
					// compensate manually: drop the provider row if the collection
					// cannot be created, instead of leaving a dangling provider.
					defaultVectorProvider = await ctx.db.vectorProvider.create({
						data: {
							userId,
							url: env.DEFAULT_VECTORPROVIDER_URL,
							name: "Default Provider",
							apiKey: env.DEFAULT_VECTORPROVIDER_SECRET,
							model: env.DEFAULT_VECTORPROVIDER_MODEL ?? "",
						},
					});
					try {
						await ctx.vdb.createCollection(defaultVectorProvider.id, {
							vectors: {
								size: env.DEFAULT_VECTORPROVIDER_VECTOR_SIZE,
								distance: "Cosine",
							},
							optimizers_config: {
								default_segment_number: 2,
							},
							replication_factor: 2,
						});
					} catch (error) {
						console.error("Failed to create vector collection:", error);
						await ctx.db.vectorProvider.delete({
							where: { id: defaultVectorProvider.id },
						});
						throw new TRPCError({ message: "Could not create Vector Provider", code: "INTERNAL_SERVER_ERROR" })
					}
				}
				vectorProviderId = defaultVectorProvider.id;
			} else {
				const vectorProvider = await ctx.db.vectorProvider.findFirst({
					where: { id: vectorProviderId, userId },
				});
				if (!vectorProvider)
					throw new TRPCError({ message: "Vector Provider not found", code: "NOT_FOUND" })
			}

			return ctx.db.sLR.create({
				data: {
					title: input.title,
					createdById: userId,
					defaultVectorProviderId: vectorProviderId,
				},
			});
		}),
	getAll: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db.sLR.findMany({
			where: {
				createdById: ctx.session.user.id,
			},
		});
	}),
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			return ctx.db.sLR.findUnique({
				where: {
					id: input.id,
					OR: [
						{ createdById: userId },
						{ participants: { some: { id: userId } } },
					],
				},
				include: { _count: { select: { items: true, participants: true } }, createdBy: { select: { name: true } } },
			});
		}),
	getItems: protectedProcedure
		.input(z.object({
			id: z.string(),
			relevance: z.nativeEnum(Relevance).optional()
		})
		)
		.query(async ({ input, ctx }) => {
			const { id, relevance } = input
			const userId = ctx.session.user.id;
			const slrWithItems = await ctx.db.sLR.findUnique({
				where: {
					id,
					OR: [
						{ createdById: userId },
						{ participants: { some: { id: userId } } },
					],
				},
				include: {
					items: {
						where: {
							relevant: relevance
						},
						include: {
							item: { select: { title: true, id: true } },
						}
					}
				}
			})

			return slrWithItems?.items.map((item) => {
				return {
					relevant: item.relevant,
					...(item.item)
				}
			})

		}),

	classifySLR: protectedProcedure
		.input(z.object({
			slrId: z.string(),
			itemIdsToClassify: z.string().array(),
		})
		)
		.mutation(async ({ ctx, input }) => {
			const { slrId, itemIdsToClassify } = input
			const userId = ctx.session.user.id;
			const isCustomSelection = itemIdsToClassify.length > 0
			const vpData = await ctx.db.sLR.findUnique({
				where: {
					id: slrId,
					OR: [
						{ createdById: userId },
						{ participants: { some: { id: userId } } },
					],
				},
				include: {
					defaultVectorProvider: true
				},
			}).then((slr) => slr?.defaultVectorProvider)
			if (!vpData)
				throw new TRPCError({ message: "SLR not found", code: "NOT_FOUND" })
			// providers created before DEFAULT_VECTORPROVIDER_MODEL existed have model ""
			const vp = new VectorProvider({
				...vpData,
				model: vpData.model || env.DEFAULT_VECTORPROVIDER_MODEL || "",
				vdb: ctx.vdb,
			})

			const itemIdsDefault = await ctx.db.item.findMany({
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

			const {failedItems}  = await prepareVectorsForClassification({
				db: ctx.db,
				vpData,
				vp,
				itemIds,
				userId
			})

      const itemIdsToClassifyFiltered = itemIdsToClassify.filter(id => !failedItems.includes(id))


			const classification = await classify({
				vdb: ctx.vdb,
				vpId: vpData.id,
				db: ctx.db,
				itemIds: [...itemIdsDefault, ...itemIdsToClassifyFiltered],
				slrId,
				userId
			})

			const BATCH_SIZE = 200;

			for (let i = 0; i < classification.length; i += BATCH_SIZE) {
				const batch = classification.slice(i, i + BATCH_SIZE);

				await Promise.all(batch.map(classification =>
					ctx.db.itemOnSLR.update({
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


			return {classification, failedItems: failedItemsWithoutFiltered}
		}),
	removeItems: protectedProcedure
		.input(z.object({
			slrId: z.string(),
			itemIds: z.string().array(),
		}))
		.mutation(async ({ ctx, input }) => {
			const { itemIds, slrId } = input
			await assertSlrAccess({ db: ctx.db, slrId, userId: ctx.session.user.id })
			return ctx.db.itemOnSLR.deleteMany({
				where: {
					itemId: { in: itemIds },
					slrId
				}
			})
		})
});

