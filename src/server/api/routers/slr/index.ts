import { Relevance } from "@prisma/client";
import prepareVectorsForClassification from "./prepareVectorsForClassification";
import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "../item/VectorProvider";
import { useServerInsertedHTML } from "next/navigation";

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
				if (!defaultVectorProvider)
					defaultVectorProvider = await ctx.db.vectorProvider.create({
						data: {
							userId,
							url: env.DEFAULT_VECTORPROVIDER_URL,
							name: "Default Provider",
							apiKey: env.DEFAULT_VECTORPROVIDER_SECRET,
						},
					});
				vectorProviderId = defaultVectorProvider.id;
				await ctx.vdb.createCollection(vectorProviderId, {
					vectors: {
						size: 1024,
						distance: "Cosine",
					},
					optimizers_config: {
						default_segment_number: 2,
					},
					replication_factor: 2,
				});
			}

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

	classifyCollection: protectedProcedure
		.input(z.object({
			slrId: z.string(),
			selectedCollection: z.string()
		})
		)
		.mutation(async ({ ctx, input }) => {
			const { selectedCollection, slrId } = input
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

			const itemIds = await ctx.db.item.findMany({
				where: {
					collectionId: selectedCollection
				},
				select: {
					id: true
				}
			}).then(d => d.map(i => i.id))


			await prepareVectorsForClassification({
				db: ctx.db,
				vpData,
				vp,
				itemIds,
				userId: ctx.session.user.id
			})
			
			await classification({
				db: ctx.db,
				itemIds,
				slrId,
				userId: ctx.session.user.id
				})
			
			return "x"
		})
});

