import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const slrRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				title: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.sLR.create({
				data: {
					title: input.title,
					createdById: ctx.session.user.id,
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
});
