import { type Db } from "~/server/db"
import { type VdbClient } from "~/server/vdb"
export default async function classify({ db, vdb, itemIds, slrId, userId, vpId }: { vpId: string, db: Db, itemIds: string[], slrId: string, userId: string, vdb: VdbClient }) {
  const items = await db.itemOnSLR.findMany({
    where: {
      slrId
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

  console.log({ items })


  const vectors = await vdb.retrieve(vpId, {
    ids: items.map(i => i.itemId),
    with_vector: true,
  })

  const vectorMap = new Map(vectors.map(v => [v.id, v]));

  const mergedItems = items.map(item => ({
    data: vectorMap.get(item.itemId)?.vector ?? null,
    label: item.relevant
  }));

  const train = mergedItems.filter(i => i.label === "RELEVANT" || i.label === "IRRELEVANT");
  const classify = mergedItems.filter(i => i.label === "UNKNOWN").map(i => ({ data: i.data }));


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

  const res = await response.json()

  console.log({res})

  return mergedItems;

}

