// Top-level array returned by the Zotero API
export type ZoteroItemResponse = ZoteroItem[];

// Single item in the Zotero response
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

// Library info (user or group)
export interface ZoteroLibrary {
  type: "user" | "group";
  id: number;
  name: string;
  links: {
    alternate: ZoteroLink;
  };
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
  creators: ZoteroCreator[];
  tags: ZoteroTag[];
  collections: string[];
  dateAdded?: string;
  dateModified?: string;
  [field: string]: any; // for additional Zotero fields like url, publisher, etc.
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

type ZoteroLibraryType = "user" | "group";

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

  /**
   * Update function to fetch items in a given collection
   * that have changed since 'lastSyncedVersion'.
   */
  public async update(
    collectionId: string,
    lastSyncedVersion: number,
  ): Promise<ZoteroItemResponse> {
    // Fetch all relevant items (pagination included) and handle timeouts
    const items = await this.fetchAllItems(collectionId, lastSyncedVersion);
    return items;
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
  private async fetchAllItems(collectionId: string, lastSyncedVersion: number) {
    let start = 0;
    const limit = 100;
    const allItems: ZoteroItemResponse = [];

    while (true) {
      const url = new URL(
        `${this.baseUrl}${this.getLibraryPrefix()}/collections/${collectionId}/items`,
      );
      url.searchParams.set("since", String(lastSyncedVersion));
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("start", String(start));
      // Request JSON format by default
      url.searchParams.set("format", "json");
      url.searchParams.set("include", "data");

      const response = await this.timeoutFetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch items. Status: ${response.status}`);
      }

      const items = (await response.json()) as ZoteroItemResponse;
      allItems.push(...items);

      // Check if there's a "rel=next" link for pagination
      const linkHeader = response.headers.get("Link") ?? "";
      const hasNext = linkHeader.includes('rel="next"');
      if (!hasNext) break;

      // If there's a next page, increment the start
      start += limit;
    }

    return allItems;
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
