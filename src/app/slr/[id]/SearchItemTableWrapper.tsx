"use client"
import { type ReactElement } from "react"
import { useState } from "react"
import Search from "./Search"
import ItemTable, { type ItemData } from "./ItemTable"
import { api } from "~/trpc/react"
import { Button } from "~/app/_components/button"
import { type RowModel } from "@tanstack/react-table"

export default function SearchItemTableWrapper({ slrId }: { slrId: string }): ReactElement {
  const [search, setSearch] = useState<string>("")
  const [collectionId, setCollectionId] = useState<string | undefined>("")
  const initialData = [{ id: "x", title: "y" }]

  const { data } = api.item.getAll.useQuery({ search, collectionId }, {
    enabled: true,
    placeholderData: (prev) => prev ?? initialData
  })
  const addItemsHook = api.item.addManyToSLR.useMutation()

  const addItems = async (selectedItems: RowModel<ItemData>) => { addItemsHook.mutate({ ids: selectedItems.rows.map(row => row.id), slrId }) }

  return <>
    <Search setSearch={setSearch} search={search} collectionId={collectionId} setCollectionId={setCollectionId} />
    <ItemTable isLoading={addItemsHook.isPending} action={addItems} data={data!} search={search} />
  </>
}
