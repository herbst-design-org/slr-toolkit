import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ZoteroSync } from "./ZoteroSync";
import { ContentProvider } from "./ContentProvider";

export const contentRouter = createTRPCRouter({
  createContentProvider: protectedProcedure
    .input(
      z.object({
        type: z.enum(["ZOTERO", "MENDELEY", "ENDNOTE"]),
        apiKey: z.string(),
        libraryType: z.enum(["user", "group"]),
        libraryId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.type === "ZOTERO") {
          const zot = new ZoteroSync({
            apiKey: input.apiKey,
            libraryType: input.libraryType,
            userId: input.libraryId,
            groupId: input.libraryId,
          });
          const valid = await zot.verify();
          if (!valid) {
            throw new Error("Invalid API Key or Library ID");
          }
        } else if (input.type === "MENDELEY") {
          throw new Error("Mendeley is not supported yet");
        } else if (input.type === "ENDNOTE") {
          throw new Error("Endnote is not supported yet");
        }
      } catch (error) {
        let errorMessage = "An unknown error occurred";

        if (error instanceof Error) {
          errorMessage = error.message;
        }
        throw new TRPCError({
          message: "Failed to create content provider: " + errorMessage,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
      return ctx.db.contentProvider.create({
        data: {
          type: input.type,
          apiKey: input.apiKey,
          userId: ctx.session.user.id,
          libraryId: input.libraryId,
          libraryType: input.libraryType,
        },
      });
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.contentProvider.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });
  }),
  getCollections: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const providerData = await ctx.db.contentProvider.findFirst({
        where: {
          id: input.providerId,
          userId: ctx.session.user.id,
        },
      });
      if (!providerData) {
        throw new TRPCError({
          message: "Provider not found",
          code: "NOT_FOUND",
        });
      }
      const provider = new ContentProvider({
        ...providerData,
        providerType: providerData.type,
      });
      return provider.getCollections();
    }),
});
