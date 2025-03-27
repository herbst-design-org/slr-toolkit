import { type Db } from "~/server/db"
import { type VdbClient } from "~/server/vdb"
type PredictionResponse = {
  predictions: number[];               // 0 or 1 for each classify item
  probabilities: number[][];          // probability for each class per item
};
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
          }
        }
      }
    }
  }).then(data => data.map(item => { return { ...item.item, ...item } }))

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
    abstract: item.abstract
  }));

  const toTrain = mergedItems.filter(i => i.label === "RELEVANT" || i.label === "IRRELEVANT");
  const toClassify = mergedItems.filter(i => i.label === "UNKNOWN");

  const train = toTrain.map(i => ({ data: i.data, label: i.label }))
  const classify = toClassify.map(i => ({ data: i.data }))


  const response = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: {
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
    abstract: item.abstract
  }));


  return classification;

}

