import { Item, ItemType } from "@prisma/client";
import { CollectionResponse, SyncProvider } from "./ContentProvider";
import { ZoteroItemResponse } from "./ZoteroSync";
import bibtexParse from "@orcid/bibtex-parse-js";

function pickDoi(tags: Record<string, any>): string | null {
  const doi =
    getField(tags, "doi") ||
    getField(tags, "DOI");

  return doi || null;
}

function pickUrl(tags: Record<string, any>): string | null {
  const url =
    getField(tags, "url") ||
    getField(tags, "URL") ||
    getField(tags, "link");

  // fallback: build URL from DOI if present
  const doi = pickDoi(tags);

  return url || (doi ? `https://doi.org/${doi}` : null);
}

function norm(v: unknown): string {
  return String(v ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getField(tags: Record<string, any>, ...names: string[]): string {
  for (const n of names) {
    if (tags[n] != null) return norm(tags[n]);
    const up = n.toUpperCase();
    if (tags[up] != null) return norm(tags[up]);
    const low = n.toLowerCase();
    if (tags[low] != null) return norm(tags[low]);
  }
  return "";
}

function splitAuthors(authorField: string): string[] {
  const s = norm(authorField);
  if (!s) return [];
  return s
    .split(/\s+and\s+/i)
    .map(norm)
    .filter(Boolean);
}

function parseYear(tags: Record<string, any>): number | null {
  const y = getField(tags, "year");
  const m = y.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function mapBibtexTypeToItemType(entryType: string): ItemType{
  // IMPORTANT: adjust return values to match your Prisma enum variants exactly.
  switch (String(entryType || "").toLowerCase()) {
    case "article":
      return "ARTICLE";
    case "inproceedings":
    case "conference":
    case "proceedings":
      return "CONFERENCE";
    case "book":
      return "BOOK";
    case "inbook":
    case "incollection":
      return "CHAPTER";
    case "phdthesis":
    case "mastersthesis":
      return "THESIS";
    case "techreport":
      return "REPORT";
    default:
      return "OTHER";
  }
}
export class BibTeXProvider implements SyncProvider {
  constructor(private readonly collectionId: string) {
    this.collectionId = collectionId;
  }

  async verify (): Promise<boolean> {
    throw new Error("BibTeX provider is not implemented yet");
  }
  
  async getCollections ({
    ids,
  }: {
    ids?: string[];
  } = {}): Promise<CollectionResponse> {
    throw new Error("BibTeX provider is not implemented yet");
  }

  async update (
    collectionId: string,
    lastSyncedVersion?: number,
  ): Promise<{items:ZoteroItemResponse; lastModifiedVersion: number | undefined;}>{

    throw new Error("BibTeX provider is not implemented yet");

  }

  async load(bibtexData: string): Promise<Item[]> {
    const parsed = bibtexParse.toJSON(bibtexData);

    return parsed.map((entry: any) => {
      const fields: Record<string, any> = entry.entryTags ?? {};
      const citationKey: string = norm(entry.citationKey);

      const title = norm(fields.title || fields.Title);
      const abstract = norm(fields.abstract || fields.Abstract) || null;

      const authors = splitAuthors(fields.author || fields.Author);
      const year = parseYear(fields);

      const doi = pickDoi(fields);
      const url = pickUrl(fields);

      // If you want to also accept "Unique-ID" from your example:
      const uniqueId =
        norm(fields["Unique-ID"]) || norm(fields["unique-id"]) || "";

      const externalId = uniqueId || citationKey || doi || title;

      const item: Omit<Item, "id" | "createdAt" | "updatedAt"> & Partial<Item> =
        {
          externalId,
          title: title || "(untitled)",
          abstract,
          authors,
          year,
          url,
          doi,
          type: mapBibtexTypeToItemType(entry.entryType || "misc"),
          collectionId: this.collectionId,
        };

      // id/createdAt/updatedAt set automatically by DB
      return item as Item;
    });
  }

}
