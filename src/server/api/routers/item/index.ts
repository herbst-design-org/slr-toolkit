import { z } from "zod";
import { env } from "~/env";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { VectorProvider } from "./VectorProvider";
import { TRPCError } from "@trpc/server";

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
			
			const item = ctx.db.item.create({
				data: {
					abstract,
					title,
					type: "BOOK",
					providerId: contentProviderId,
					slrId,
					vectors: {
						create: {
							embedding,
							providerId: vectorProviderId,
						},
					},
				},
			});
		}),
});
