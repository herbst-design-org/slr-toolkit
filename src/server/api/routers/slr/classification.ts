import { type Db } from "~/server/db"
import { type VdbClient } from "~/server/vdb"
import { env } from "~/env";
type PredictionResponse = {
	predictions: number[];               // 0 or 1 for each classify item
	probabilities: number[][];          // probability for each class per item
};


const getLink = (item: { doi?: string |null; collection: { provider: { libraryType: string | null; type: string; libraryId: string | null; } }, externalId: string }) => {
switch (item.collection.provider.type) {
  case "ZOTERO":
    return `zotero://select/${(item.collection.provider.libraryType === "group") ? "groups/" + item.collection.provider.libraryId : "library"}/items/${item.externalId} `
    case "BIBTEX":
    return item.doi ? `https://doi.org/${item.doi}` : ""
  default:
    return "#"
}
}


export default async function classify({ db, vdb, itemIds, slrId, userId, vpId }: { vpId: string, db: Db, itemIds: string[], slrId: string, userId: string, vdb: VdbClient }) {
	const items = await db.itemOnSLR.findMany({
		where: {
			slrId,
			itemId: { in: itemIds }
		},
		include: {
			item: {
				include: {
					vectors: {
						where: {
							provider: {
								id: vpId
							}
						}
					},
					collection: {
						include: {
							provider: {
								select: {
									type: true,
									libraryType: true,
									libraryId: true,
								}
							}
						}
					}

				}
			}
		}
	}).then(data => data.map(item => { return { ...item.item, ...item, link: getLink(item.item) } }))


	//console.log({ items })


	const vectors = await vdb.retrieve(vpId, {
		ids: items.map(i => i.itemId),
		with_vector: true,
	})

	const vectorMap = new Map(vectors.map(v => [v.id, v]));

	const mergedItems = items.map(item => ({
		id: item.id,
		data: vectorMap.get(item.itemId)?.vector ?? null,
		label: item.relevant,
		title: item.title,
		abstract: item.abstract,
		link: item.link
	}));

	const toTrain = mergedItems.filter(i => i.label === "RELEVANT" || i.label === "IRRELEVANT");
	const toClassify = mergedItems.filter(i => i.label === "UNKNOWN");

	const train = toTrain.map(i => ({ data: i.data, label: i.label }))
	const classify = toClassify.map(i => ({ data: i.data }))


	const username = env.DEFAULT_CLASSIFIER_USERNAME;
	const password = env.DEFAULT_CLASSIFIER_PASSWORD;
	const url = env.DEFAULT_CLASSIFIER_URL;
	const auth = Buffer.from(`${username}:${password}`).toString('base64');

	const response = await fetch(url, {
		method: "POST",
		headers: {
			'Authorization': `Basic ${auth}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			train,
			classify
		})
	})
	const res = (await response.json()) as PredictionResponse

	const classification = toClassify.map((item, index) => ({
		id: item.id,
		prediction: res.predictions[index],
		probabilities: res.probabilities[index],
		title: item.title,
		abstract: item.abstract,
		link: item.link
	}));


	return classification;

}

