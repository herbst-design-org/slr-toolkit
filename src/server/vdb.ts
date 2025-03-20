import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "~/env";

// or connect to Qdrant Cloud
export const vdb = new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_SECRET,
    port: parseInt(env.QDRANT_PORT),
});

export type VdbClient = typeof vdb
