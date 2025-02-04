import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
			}

			const slr = await ctx.db.sLR.create({
				data: {
					title: input.title,
					createdById: userId,
					defaultVectorProviderId: vectorProviderId,
				},
			});
			console.log({ slr, vdb: ctx.vdb });
			await ctx.vdb.createCollection(slr.id, {
				vectors: {
					size: 1536,
					distance: "Cosine",
				},
				optimizers_config: {
					default_segment_number: 2,
				},
				replication_factor: 2,
			});
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
		.query(({ ctx, input }) => {
			const userId = ctx.session.user.id;
			return ctx.db.sLR.findUnique({
				where: {
					id: input.id,
					OR: [
						{ createdById: userId },
						{ participants: { some: { id: userId } } },
					],
				},
				include: { _count: { select: { items: true, participants: true } }, createdBy: {select: {name: true}} },
			});
		}),
});
