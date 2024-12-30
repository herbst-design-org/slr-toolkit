import { ZoteroSync } from "./ZoteroSync";
import type { ContentProviderType } from "@prisma/client";
import type { ZoteroLibraryType, ZoteroItemResponse } from "./ZoteroSync";

type LibraryType = ZoteroLibraryType;
type ItemResponse = ZoteroItemResponse;
export type CollectionResponse = {
  id: string;
  name: string;
  parentCollection?: string;
  numberOfItems?: number;
}[];

export interface SyncProvider {
  getCollections(): Promise<CollectionResponse>;
  verify(): Promise<boolean>;
  update(
    collectionId: string,
    lastSyncedVersion: number,
  ): Promise<ItemResponse>;
}

interface ContentProviderConfig {
  providerType: ContentProviderType;
  apiKey: string;
  libraryType: LibraryType | null;
  userId?: string;
  groupId?: string;
}

export class ContentProvider {
  private provider: SyncProvider;

  constructor(config: ContentProviderConfig) {
    const { providerType, apiKey, libraryType, userId, groupId } = config;

    switch (providerType) {
      case "ZOTERO":
        if (!libraryType) {
          throw new Error("Missing 'libraryType' for Zotero provider");
        }
        this.provider = new ZoteroSync({
          apiKey,
          libraryType,
          userId,
          groupId,
        });
        break;
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  getCollections(): Promise<CollectionResponse> {
    return this.provider.getCollections();
  }
}
