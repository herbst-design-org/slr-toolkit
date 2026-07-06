import { TRPCError } from "@trpc/server";
import { type Db } from "~/server/db";

/**
 * Ensure the user owns or participates in the SLR.
 * Throws NOT_FOUND otherwise (so non-members cannot probe for existing ids).
 */
export async function assertSlrAccess({
	db,
	slrId,
	userId,
}: {
	db: Db;
	slrId: string;
	userId: string;
}) {
	const slr = await db.sLR.findFirst({
		where: {
			id: slrId,
			OR: [
				{ createdById: userId },
				{ participants: { some: { id: userId } } },
			],
		},
	});
	if (!slr) {
		throw new TRPCError({ code: "NOT_FOUND", message: "SLR not found" });
	}
	return slr;
}
