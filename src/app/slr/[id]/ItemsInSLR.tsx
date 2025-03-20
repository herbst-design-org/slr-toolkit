"use client"
import { type SLR } from "@prisma/client"
import { useState, type ReactElement } from "react"
import ItemTable, { type ItemData } from "./ItemTable"
import { api } from "~/trpc/react"
import { Subheading } from "~/app/_components/heading"
import { type RowModel } from "@tanstack/react-table"

export default function ItemsInSLR({ slr }: { slr: SLR }): ReactElement {
  const { data: relevantItems } = api.slr.getItems.useQuery({ id: slr.id, relevance: "RELEVANT" })
  const { data: irrelevantItems } = api.slr.getItems.useQuery({ id: slr.id, relevance: "IRRELEVANT" })
  const { data: unknownItems } = api.slr.getItems.useQuery({ id: slr.id, relevance: "UNKNOWN" })

  const classifyItemsHook = api.slr.classifyItems.useMutation()

  const action = {
    buttonText: "Classify",
    action: async (selectedItems: RowModel<ItemData>) => {
      classifyItemsHook.mutate({
        slrId: slr.id,
        selectedItemIds: selectedItems.rows.map(row => row.id)
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
    <div className="col-span-2">
      <Subheading>Unknown</Subheading>
      <ItemTable data={unknownItems ?? []} {...action} />
    </div>
  </div>
}
