import { type Db } from "~/server/db";
import { type VdbClient } from "~/server/vdb";
import { callClassifier, getLabeledVectors } from "./classification";
import { resolveVectorProvider } from "./runClassification";

/**
 * Classify a piece of ad-hoc text (e.g. title + abstract, or an extracted
 * PDF page) against an SLR's labeled items. Nothing is stored: the text is
 * embedded on the fly and scored against the current training set.
 */
export default async function classifyAdhocText({ db, vdb, slrId, userId, text }: {
	db: Db;
	vdb: VdbClient;
	slrId: string;
	userId: string;
	text: string;
}) {
	const { vp, vpData } = await resolveVectorProvider({ db, vdb, slrId, userId })

	const train = await getLabeledVectors({ db, vdb, slrId, vpId: vpData.id })
	if (train.length === 0) {
		throw new Error(
			"This SLR has no labeled items to learn from. Mark some items as RELEVANT or IRRELEVANT (and run a classification once so they are embedded) before using quick classification.",
		)
	}

	const embedding = await vp.generateEmbedding(text)
	if (!embedding) {
		throw new Error("The vector provider failed to generate an embedding for the text")
	}

	const res = await callClassifier({ train, classify: [{ data: embedding }] })
	return {
		prediction: res.predictions[0],
		probabilities: res.probabilities[0],
		trainedOn: train.length,
	}
}
