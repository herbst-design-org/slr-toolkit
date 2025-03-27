import { ZoteroSync } from "./ZoteroSync";
import type { ContentProviderType } from "@prisma/client";
import type { ZoteroLibraryType, ZoteroItemResponse } from "./ZoteroSync";
type LibraryType = ZoteroLibraryType;
export type ItemResponse = ZoteroItemResponse;
export type SingleItem = ItemResponse[number]
export type CollectionResponse = {
  id: string;
  name: string;
  parentId?: string;
  numberOfItems?: number;
}[];
export interface SyncProvider {
  getCollections({ ids }: { ids?: string[] }): Promise<CollectionResponse>;
  verify(): Promise<boolean>;
  update(
    collectionId: string,
    lastSyncedVersion?: number,
  ): Promise<{ items: ItemResponse; lastModifiedVersion: number | undefined }>;
}

interface ContentProviderConfig {
  providerType: ContentProviderType;
  apiKey: string;
  libraryType: LibraryType | null;
  libraryId: string | null;
}

export class ContentProvider {
  private provider: SyncProvider;

  constructor(config: ContentProviderConfig) {
    const { providerType, apiKey, libraryType, libraryId } = config;

    switch (providerType) {
      case "ZOTERO":
        if (!libraryType) {
          throw new Error("Missing 'libraryType' for Zotero provider");
        }
        if (!libraryId) {
          throw new Error("Missing 'libraryId' for Zotero provider");
        }
        this.provider = new ZoteroSync({
          apiKey,
          libraryType,
          userId: libraryId,
          groupId: libraryId,
        });
        break;
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }
  getCollections({ ids }: { ids?: string[] }): Promise<CollectionResponse> {
    return this.provider.getCollections({ ids });
  }
  update({
    collectionId,
    lastSyncedVersion,
  }: {
    collectionId: string;
    lastSyncedVersion?: number;
  }): Promise<{
    items: ItemResponse;
    lastModifiedVersion: number | undefined;
  }> {
    return this.provider.update(collectionId, lastSyncedVersion);
  }
}
