import { resourceMetadataResponse } from "~/server/mcp/resource-metadata";

/** Root metadata location, for clients that don't use the path-inserted form. */
export function GET(request: Request): Response {
	return resourceMetadataResponse(request);
}
