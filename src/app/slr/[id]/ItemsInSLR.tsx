"use client"
import { type SLR } from "@prisma/client"
import { useState, type ReactElement } from "react"
import ItemTable, { type ItemData } from "./ItemTable"
import { api, type RouterOutputs } from "~/trpc/react"
import { Subheading } from "~/app/_components/heading"
import { type RowModel } from "@tanstack/react-table"
import { Text } from "~/app/_components/text"
import { Badge } from "~/app/_components/badge"
import QuickClassify from "~/app/_components/quick-classify"

type R_SlrClassifySLR = RouterOutputs["slr"]["classifySLR"]

export default function ItemsInSLR({ slr }: { slr: SLR }): ReactElement {
  const { data: relevantItems } = api.slr.getItems.useQuery({ id: slr.id, relevance: "RELEVANT" })
  const { data: irrelevantItems } = api.slr.getItems.useQuery({ id: slr.id, relevance: "IRRELEVANT" })
  const { data: unknownItems } = api.slr.getItems.useQuery({ id: slr.id, relevance: "UNKNOWN" })

  const [result, setResult] = useState<R_SlrClassifySLR>([])
  const classifyItemsHook = api.slr.classifySLR.useMutation({
    onSuccess: (data) => {
      console.log({ data })
      setResult(() => data.sort((a, b) => ((b.probabilities?.[1] ?? 0) - (a.probabilities?.[1] ?? 0))))
    }
  })

  const action = {
    buttonText: "Classify",
    action: async (selectedItems: RowModel<ItemData>) => {
      classifyItemsHook.mutate({
        slrId: slr.id,
        itemIdsToClassify: selectedItems.rows.map(r => r.id)
      })
    },
    isLoading: classifyItemsHook.isPending
  }





  return <div className="grid grid-cols-2 gap-12 mt-12">

    <div>
      <Subheading>Relevant</Subheading>
      <ItemTable data={relevantItems ?? []} />
    </div>
    <div>
      <Subheading>Irrelevant</Subheading>
      <ItemTable data={irrelevantItems ?? []} />
    </div>
    <div className="col-span-1">
      <Subheading>Unknown</Subheading>
      <ItemTable data={unknownItems ?? []} {...action} />
    </div>
    <div>

      <Subheading> Result </Subheading>
      <div className="mt-2 custom-scrollbar max-h-[500px] flex-col flex gap-4 overflow-y-scroll" >
        {result.length && result.map((r, i) =>
          <div key={r.id} className="justify-between flex items-center gap-2">
            <div className="flex gap-2 items-center">
              <Badge> {r.probabilities?.[1]?.toFixed(2)} </Badge>
              <Text> {r.title} </Text>
            </div>
            <QuickClassify itemId={r.id} slrId={slr.id} />
          </div>)}
      </div>
    </div>

  </div>
}

