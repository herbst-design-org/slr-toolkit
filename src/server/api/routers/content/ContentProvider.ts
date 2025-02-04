import { ZoteroSync } from "./ZoteroSync";
import type { ContentProviderType } from "@prisma/client";
import type { ZoteroLibraryType, ZoteroItemResponse } from "./ZoteroSync";
import type { CollectionResponse } from "~/app/_components/tree";
type LibraryType = ZoteroLibraryType;
type ItemResponse = ZoteroItemResponse;

export interface SyncProvider {
  getCollections({ ids }: { ids?: string[] }): Promise<CollectionResponse>;
  verify(): Promise<boolean>;
  update(
    collectionId: string,
    lastSyncedVersion?: number,
  ): Promise<ItemResponse>;
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
  }): Promise<ItemResponse> {
    return this.provider.update(collectionId, lastSyncedVersion);
  }
}
