import { type CollectionResponse } from "./ContentProvider";

// Top-level array returned by the Zotero API
export type ZoteroItemResponse = ZoteroItem[];

export interface ZoteroItem {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: {
    self: ZoteroLink;
    alternate: ZoteroLink;
  };
  meta: ZoteroMeta;
  data: ZoteroItemData;
}

export interface ZoteroLibrary {
  type: "user" | "group";
  id: number;
  name: string;
  links: {
    alternate: ZoteroLink;
  };
}

export interface ZoteroCollection {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: {
    self: ZoteroLink;
    alternate: ZoteroLink;
    up: ZoteroLink;
  };
  meta: CollectionMeta;
  data: CollectionData;
}

interface CollectionMeta {
  numCollections: number;
  numItems: number;
}

interface CollectionData {
  key: string;
  version: number;
  name: string;
  parentCollection?: string;
  relations: Record<string, string>;
  deleted?: boolean
}

// Standard hyperlink info
export interface ZoteroLink {
  href: string;
  type: string;
}

// Metadata (e.g. number of children, parsed dates, etc.)
export interface ZoteroMeta {
  creatorSummary?: string;
  parsedDate?: string;
  numChildren: number;
}

// Main data within each Zotero item
export interface ZoteroItemData {
  key: string;
  version: number;
  itemType: string;
  title: string;
  abstractNote: string;
  creators: ZoteroCreator[];
  tags: ZoteroTag[];
  collections: string[];
  dateAdded?: string;
  dateModified?: string;
  [field: string]: unknown; // for additional Zotero fields like url, publisher, etc.
}

// Creators can be "author", "contributor", or have just a "name"
export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

// Tag object
export interface ZoteroTag {
  tag: string;
  type: number;
}

export type ZoteroLibraryType = "user" | "group";

interface ZoteroConfig {
  apiKey: string;
  libraryType: ZoteroLibraryType;
  userId?: string; // required if libraryType = 'user'
  groupId?: string; // required if libraryType = 'group'
  timeoutMs?: number; // optional fetch timeout, defaults to e.g. 10s
}

export class ZoteroSync {
  private baseUrl = "https://api.zotero.org";

  constructor(private config: ZoteroConfig) {
    if (config.libraryType === "user" && !config.userId) {
      throw new Error("Missing 'userId' for user library");
    }
    if (config.libraryType === "group" && !config.groupId) {
      throw new Error("Missing 'groupId' for group library");
    }
  }

  public async verify(): Promise<boolean> {
    const url = `${this.baseUrl}${this.getLibraryPrefix()}/items`;
    const response = await this.timeoutFetch(url);
    return response.ok;
  }

  /**
   * Update function to fetch items in a given collection
   * that have changed since 'lastSyncedVersion'.
   */
  public async update(
    collectionId: string,
    lastSyncedVersion?: number,
  ): Promise<{
    items: ZoteroItemResponse;
    lastModifiedVersion: number | undefined;
  }> {
    // Fetch all relevant items (pagination included) and handle timeouts
    const items = await this.fetchAllItems(collectionId, lastSyncedVersion);
    return items;
  }
  /**
   * Fetch all collections in the Zotero library.
   */
  public async getCollections({
    ids,
  }: {
    ids?: string[];
  } = {}): Promise<CollectionResponse> {
    const url = `${this.baseUrl}${this.getLibraryPrefix()}/collections`;
    console.log(url);
    const response = await this.timeoutFetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch collections. Status: ${response.status}`,
      );
    }

    const collections = (await response.json()) as ZoteroCollection[];
    collections.map((c) => console.log({ c }))
    const formattedCollections = collections
      .filter((c) => (!ids || ids.includes(c.key)) && !c.data.deleted)
      .map((c) => ({
        id: c.key,
        name: c.data.name,
        parentId: c.data.parentCollection,
        numberOfItems: c.meta.numItems,
      }));
    return formattedCollections;
  }

  private getLibraryPrefix(): string {
    if (this.config.libraryType === "user") {
      return `/users/${this.config.userId}`;
    }
    return `/groups/${this.config.groupId}`;
  }

  /**
   * Paginate through Zotero items using 'since=lastSyncedVersion'.
   * Returns all items that have changed since 'lastSyncedVersion'.
   */
  private async fetchAllItems(
    collectionId: string,
    lastSyncedVersion?: number,
  ) {
    console.log({ lastSyncedVersion });
    let start = 0;
    const limit = 100;
    const allItems: ZoteroItemResponse = [];
    let lastModifiedVersion = lastSyncedVersion;

    while (true) {
      const url = new URL(
        `${this.baseUrl}${this.getLibraryPrefix()}/collections/${collectionId}/items`,
      );
      if (lastSyncedVersion)
        url.searchParams.set("since", String(lastSyncedVersion));
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("start", String(start));
      // Request JSON format by default
      url.searchParams.set("format", "json");
      url.searchParams.set("include", "data");
      url.searchParams.set("itemType", "-attachment");

      const response = await this.timeoutFetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch items. Status: ${response.status}`);
      }

      const items = (await response.json()) as ZoteroItemResponse;
      allItems.push(...items);
      console.log({ items: items[0]?.data })
      try {
        lastModifiedVersion = parseInt(
          response.headers.get("last-modified-version") ?? "",
        );
      } catch (e) {
        console.log(e);
      }
      // Check if there's a "rel=next" link for pagination
      const linkHeader = response.headers.get("Link") ?? "";
      const hasNext = linkHeader.includes('rel="next"');
      if (!hasNext) break;

      // If there's a next page, increment the start
      start += limit;
    }
    if(collectionId === "3DWP9QVZ") {
      console.log({ allItems });
    }

    return {
      items: allItems,
      lastModifiedVersion,
    };
  }

  /**
   * Helper to handle fetch with an AbortController timeout.
   */
  private async timeoutFetch(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const timeout = this.config.timeoutMs ?? 10000; // default 10s
    const id = setTimeout(() => ctrl.abort(), timeout);

    try {
      return await fetch(url, {
        method: "GET",
        headers: {
          "Zotero-API-Key": this.config.apiKey,
          "Zotero-API-Version": "3",
        },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(id);
    }
  }
}
