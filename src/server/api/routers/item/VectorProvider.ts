import { type Item } from "@prisma/client";
import { type VdbClient } from "~/server/vdb";

type EmbeddingResponse = {
	embedding?: number[];
	data?: { embedding: number[] }[];
} | number[];

export class VectorProvider {
	public id: string;
	private url: string;
	private apiKey: string;
	private model: string;
	private vdb: VdbClient;

	constructor({ url, apiKey, model, id, vdb }: { vdb: VdbClient, id: string, url: string, apiKey: string, model: string }) {
		this.url = url;
		this.id = id;
		this.apiKey = apiKey;
		this.model = model;
		this.vdb = vdb;
	}

	async generateEmbedding(input: string): Promise<number[] | undefined> {

		const payload = {
			prompt: input,
			input,
			model: this.model,
		};

		const headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
		};

		try {
			const response = await fetch(this.url, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const err = await response.text();
				throw new Error(`API ${this.url} error ${response.status}: ${err}`);
			}

			const json = await response.json() as EmbeddingResponse;

			// 🔁 Normalize different formats
			if (Array.isArray(json)) {
				// e.g. [0.1, 0.2, 0.3]
				return json;
			} else if (json.data?.[0]?.embedding) {
				// OpenAI format
				return json.data[0].embedding;
			} else if (json.embedding) {
				// Custom API that returns { embedding: [...] }
				return json.embedding;
			}

			throw new Error("Unrecognized embedding response format");
		} catch (error) {
			console.error("Embedding error:", error);
			return;
		}
	}
	async generateAndSaveEmbedding({ input, embeddingId, collectionId }: { input: string, embeddingId: string, collectionId: string }) {
		const embedding = await this.generateEmbedding(input)
		if (!embedding) return
		const payload = {
			points: [
				{
					id: embeddingId,
					vector: embedding,
				}
			]
		}
		let vdbResponse
		try {
			vdbResponse = await this.vdb.upsert(
				collectionId, payload)
		} catch (error) {
			console.log(error)
		}
		console.log({ ...vdbResponse, embeddingId })
		return { ...vdbResponse, embeddingId }
	}
	/**
	 * generate embeddings and save them in vdb collection
	 * @param input: list of items
	 * @param vdb: QDrant Client
	 * @param collectionId: the id of the collection in vdb if not set is VP id
	 */
	async generateAndSaveEmbeddings({ input, collectionId }: { input: Item[], collectionId: string }) {
		const genInput = (i: Item) => `${i.title ? "Title: " + i.title : ""} ${i.abstract ? "Abstract: " + i.abstract : ""}`
		return Promise.all(input.map(i => this.generateAndSaveEmbedding({ input: genInput(i), embeddingId: i.id, collectionId: collectionId ?? this.id })))
	}
}
