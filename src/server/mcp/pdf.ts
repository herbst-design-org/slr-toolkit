import { extractText, getDocumentProxy } from "unpdf";

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

/**
 * Extract the text of the first page of a PDF. Standalone so callers (e.g.
 * the quick-classify MCP tool) can pipe the result straight into
 * classification without the page text ever entering an agent's context.
 */
export async function extractFirstPageText(pdf: Uint8Array): Promise<string> {
	const doc = await getDocumentProxy(pdf);
	const { text } = await extractText(doc, { mergePages: false });
	const firstPage = (Array.isArray(text) ? text[0] : text) ?? "";
	if (!firstPage.trim()) {
		throw new Error(
			"Could not extract text from the first PDF page (the PDF may consist of scanned images)",
		);
	}
	return firstPage.trim();
}

/** Download a PDF and extract its first page's text. */
export async function fetchPdfFirstPageText(url: string): Promise<string> {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("Only http(s) PDF URLs are supported");
	}
	const response = await fetch(parsed, {
		redirect: "follow",
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		headers: { Accept: "application/pdf,*/*" },
	});
	if (!response.ok) {
		throw new Error(`Failed to download PDF: HTTP ${response.status}`);
	}
	const buffer = await response.arrayBuffer();
	if (buffer.byteLength > MAX_PDF_BYTES) {
		throw new Error("PDF is too large (limit 20 MB)");
	}
	return extractFirstPageText(new Uint8Array(buffer));
}
