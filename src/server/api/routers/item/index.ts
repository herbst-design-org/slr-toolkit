import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

import { ContentProvider, type SingleItem } from "../content/ContentProvider";
import { subtractList } from "~/lib/helpers/subtractList";
import importBibtex from "./importBibtex";
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
				skipDuplicates: true,
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
		const results = await Promise.allSettled(
			cpData.map(async (cp) => {
				const collectionsOfProvider = await ctx.db.collection.findMany({
					where: { providerId: cp.id, isSynced: true },
				});
				const contentProvider = new ContentProvider({
					...cp,
					providerType: cp.type,
				});

				let syncedItems = 0;
				for (const col of collectionsOfProvider) {
					const { items, lastModifiedVersion } = await contentProvider.update({
						collectionId: col.externalId,
						lastSyncedVersion: col.lastSyncedVersion,
					});
					// upsert so that concurrent syncs cannot fail on the
					// (externalId, collectionId) unique constraint
					await Promise.all(
						items.map((item) =>
							ctx.db.item.upsert({
								where: {
									externalId_collectionId: {
										externalId: item.key,
										collectionId: col.id,
									},
								},
								create: {
									...zoteroItemFields(item),
									externalId: item.key,
									collectionId: col.id,
								},
								update: zoteroItemFields(item),
							}),
						),
					);
					// only fetch changes since this version on the next sync
					if (lastModifiedVersion && lastModifiedVersion !== col.lastSyncedVersion) {
						await ctx.db.collection.update({
							where: { id: col.id },
							data: { lastSyncedVersion: lastModifiedVersion },
						});
					}
					syncedItems += items.length;
				}
				return syncedItems;
			}),
		);

		const failedProviders: string[] = [];
		let syncedItems = 0;
		results.forEach((result, index) => {
			if (result.status === "fulfilled") {
				syncedItems += result.value;
			} else {
				console.error("A provider failed to sync:", result.reason);
				failedProviders.push(cpData[index]!.name);
			}
		});

		return { syncedItems, failedProviders };
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
      try {
        const { items } = await importBibtex({
          db: ctx.db,
          userId: ctx.session.user.id,
          bibtexData: input.bibtexData,
          collectionExternalId: input.collectionId,
          collectionTitle: input.collectionTitle,
        });
        return items;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "BibTeX import failed",
        });
      }
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

