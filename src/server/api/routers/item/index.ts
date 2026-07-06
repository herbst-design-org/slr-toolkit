import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

import { randomUUID } from "crypto";
import { ContentProvider, type SingleItem } from "../content/ContentProvider";
import { subtractList } from "~/lib/helpers/subtractList";
import { type Db } from "~/server/db";
import { Relevance, type ItemType } from "@prisma/client";
import { assertSlrAccess } from "~/server/api/authz";

export const itemRouter = createTRPCRouter({
	getAll: protectedProcedure
		.input(
			z.object({
				search: z.string(),
				collectionId: z.string().optional(),
        take: z.number().min(1).max(5000).default(100),
			}),
		)
		.query(async ({ input, ctx }) => {
			const { search, collectionId, take } = input;

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
				take,
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
		.mutation(async ({ ctx, input }) => {
			const { ids, slrId, relevance } = input;
			await assertSlrAccess({ db: ctx.db, slrId, userId: ctx.session.user.id });
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
			const provider = await ctx.db.contentProvider.findFirst({
				where: { id: providerId, userId: ctx.session.user.id },
			});
			if (!provider) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
			}

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

			return Promise.all([
				collectionsToCreatePromise,
				collectionsToStopSyncingPromise,
				collectionsToRestartSyncingPromise,
			]);
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
    if (result.status === "fulfilled") {
      return result.value.flat();
    } else {
      console.error("A provider failed to sync:", result.reason);
      return [];
    }
  });

const requiredUpdatesExternalIds = requiredUpdatesFlat.map((i) => i.key);

		// cases item does exist in db, item does not exist in db
		const itemIdsToUpdate = await ctx.db.item
			.findMany({
				where: {
					externalId: { in: requiredUpdatesExternalIds },
					collection: { provider: { userId } },
				},
			})
			.then((data) => data.map((i) => i.externalId));
		const itemIdsToCreate = subtractList({
			subtract: itemIdsToUpdate,
			from: requiredUpdatesExternalIds,
		});

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
			await assertSlrAccess({ db: ctx.db, slrId, userId: ctx.session.user.id });
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
    createFromBibtex: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        bibtexData: z.string(),
        collectionTitle: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { collectionId, bibtexData } = input;
      let providerData = await ctx.db.contentProvider.findFirst({
        where: {
          type: "BIBTEX",
          userId: ctx.session.user.id,
        },
      });

      if (!providerData) {
        providerData = await ctx.db.contentProvider.create({
          data: {
            id: `cp_bibtex_${randomUUID()}`,
            name: "BibTeX Importer",
            type: "BIBTEX",
            userId: ctx.session.user.id,
          apiKey: "none",

          },
        });
      }

      const provider = new ContentProvider({
        ...providerData,
      libraryId: collectionId,
        providerType: providerData.type,
      });

      const items = await provider.load({items: bibtexData});
      let collection = null;

      if (items && items.length > 0) {
        collection = await ctx.db.collection.upsert({
          where: {
            externalId_providerId: {
              externalId: collectionId,
              providerId: providerData.id,
            }
          
          },
          create: {
            externalId: collectionId,
            title: input.collectionTitle,
            providerId: providerData.id,
            isSynced: false,
          },
          update: {},
        });
      }
    if (!collection) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create or find collection for BibTeX import.",
      });
    }
      return Promise.all(
        items.map((item) =>
          ctx.db.item.create({
            data: {...item, collectionId: collection?.id}, 
          }),
        ),
      );

  }),
});

const ZOTERO_ITEM_TYPE_MAP: Record<string, ItemType> = {
	journalArticle: "ARTICLE",
	magazineArticle: "ARTICLE",
	newspaperArticle: "ARTICLE",
	preprint: "ARTICLE",
	book: "BOOK",
	bookSection: "CHAPTER",
	conferencePaper: "CONFERENCE",
	report: "REPORT",
	thesis: "THESIS",
	webpage: "WEBPAGE",
	blogPost: "WEBPAGE",
};

const asOptionalString = (value: unknown) =>
	typeof value === "string" && value !== "" ? value : null;

const zoteroItemFields = (item: SingleItem) => {
	const { data, meta } = item;
	const authors = (data.creators ?? [])
		.map((c) => c.name ?? [c.firstName, c.lastName].filter(Boolean).join(" "))
		.filter(Boolean);
	const yearMatch = /\b(19|20)\d{2}\b/.exec(
		meta.parsedDate ?? asOptionalString(data.date) ?? "",
	);
	return {
		title: data.title || "unknown",
		abstract: data.abstractNote || null,
		authors,
		year: yearMatch ? Number(yearMatch[0]) : null,
		doi: asOptionalString(data.DOI),
		url: asOptionalString(data.url),
		type: ZOTERO_ITEM_TYPE_MAP[data.itemType] ?? "OTHER",
	};
};

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
				data: zoteroItemFields(item),
			});
		}),
	);
	const creations = Promise.all(
		itemIdsToCreate.map((itemId) => {
			const item = data.find((d) => d.key === itemId);
			if (!item) return;
			return db.item.create({
				data: {
					...zoteroItemFields(item),
					externalId: itemId,
					collectionId: item.collectionId,
				},
			});
		}),
	);
	return Promise.all([creations, updates]);
};
