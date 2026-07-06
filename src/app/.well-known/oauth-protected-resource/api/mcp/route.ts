import { resourceMetadataResponse } from "~/server/mcp/resource-metadata";

/** RFC 9728 path-inserted metadata location for the /api/mcp resource. */
export function GET(request: Request): Response {
	return resourceMetadataResponse(request);
}
