import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const contentRouter = createTRPCRouter({
  createContentProvider: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ZOTERO", "MENDELEY", "ENDNOTE"]),
        apiKey: z.string,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contentProvider.create({
        data: {},
      });
    }),
});
