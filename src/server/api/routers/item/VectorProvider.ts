type EmbeddingResponse = {
  data: Array<{
    embedding: number[];
  }>;
};

export class VectorProvider {
  private url: string;
  private apiKey: string;
  private model: string;

  constructor({url, apiKey, model}:{url: string, apiKey: string, model: string}) {
    this.url = url;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateEmbedding(input: string): Promise<number[] | undefined> {
    const payload = {
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
        throw new Error(
          `Error from API: ${response.status} ${response.statusText}`,
        );
      }

      const responseData: EmbeddingResponse =
        (await response.json()) as EmbeddingResponse;
      if (
        !responseData.data ||
        responseData.data.length === 0 ||
        responseData.data[0]?.embedding
      ) {
        throw new Error("No embeddings found in the response");
      }

      return responseData.data[0]?.embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }
}
