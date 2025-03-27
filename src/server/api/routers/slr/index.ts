import { Relevance } from "@prisma/client";
import prepareVectorsForClassification from "./prepareVectorsForClassification";
import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "../item/VectorProvider";
import classify from "./classification";
import { TRPCError } from "@trpc/server";

export const slrRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				title: z.string(),
				vectorProviderId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			console.log("here1")
			const userId = ctx.session.user.id;
			let { vectorProviderId } = input;
			if (vectorProviderId === "default") {
				let defaultVectorProvider = await ctx.db.vectorProvider.findFirst({
					where: { userId, name: "Default Provider" },
				});
				if (!defaultVectorProvider) {
					await ctx.db.$transaction(async (transDb) => {
						defaultVectorProvider = await transDb.vectorProvider.create({
							data: {
								userId,
								url: env.DEFAULT_VECTORPROVIDER_URL,
								name: "Default Provider",
								apiKey: env.DEFAULT_VECTORPROVIDER_SECRET,
							},
						});
						return await ctx.vdb.createCollection(vectorProviderId, {
							vectors: {
								size: 1024,
								distance: "Cosine",
							},
							optimizers_config: {
								default_segment_number: 2,
							},
							replication_factor: 2,
						});
					})
				}
				if (!defaultVectorProvider)
					throw new TRPCError({ message: "Could not create Vector Provider", code: "INTERNAL_SERVER_ERROR" })
				vectorProviderId = defaultVectorProvider?.id;
			}
			console.log("here")

			const slr = await ctx.db.sLR.create({
				data: {
					title: input.title,
					createdById: userId,
					defaultVectorProviderId: vectorProviderId,
				},
			});
			console.log({ slr, vdb: ctx.vdb });

			return slr;
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
			const slrWithItems = await ctx.db.sLR.findUnique({
				where: {
					id
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
			const isCustomSelection = itemIdsToClassify.length > 0
			const vpData = await ctx.db.sLR.findUnique({
				where: {
					id: slrId
				},
				include: {
					defaultVectorProvider: true
				},
			}).then((slr) => slr?.defaultVectorProvider)
			if (!vpData) return []
			const vp = new VectorProvider({ ...vpData, vdb: ctx.vdb })

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
			console.log({ found: itemIds.length })


			await prepareVectorsForClassification({
				db: ctx.db,
				vpData,
				vp,
				itemIds,
				userId: ctx.session.user.id
			})

			const classification = await classify({
				vdb: ctx.vdb,
				vpId: vpData.id,
				db: ctx.db,
				itemIds,
				slrId,
				userId: ctx.session.user.id
			})
			console.log({ classification })

			await Promise.all(classification.map(classification => ctx.db.itemOnSLR.update({
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
									data: classification.probabilities!.map((prob, index) => ({ label: index.toString(), probability: prob }))
								}
							}
						}
					}

				}
			})))
			return classification
		})
});

