"use client"
import { useEffect, type ReactElement } from "react"
import { useState } from "react"
import Search, { type Collection } from "./Search"
import ItemTable, { type ItemData } from "./ItemTable"
import { api } from "~/trpc/react"
import { Button } from "~/app/_components/button"
import { type RowModel } from "@tanstack/react-table"
import { Select } from "~/app/_components/select"
import { Field, Description, Label, Fieldset } from "~/app/_components/fieldset"
import { type Relevance } from "@prisma/client"


export default function SearchItemTableWrapper({ slrId }: { slrId: string }): ReactElement {
	const [search, setSearch] = useState<string>("")
	const [collectionId, setCollectionId] = useState<string | undefined>("")
	const initialData = [{ id: "x", title: "y" }]

	const { data: providers } = api.contentProvider.getAll.useQuery()

	const [allCollections, setAllCollections] = useState<Collection[]>([])

	useEffect(
		() => {
			if (providers)
				setAllCollections(getAllCollectionsFromProviders({ providers: providers }))
		}, [providers, setAllCollections]
	)



	const getAllCollectionsFromProviders = ({
		providers,
	}: {
		providers: { name: string; collection: { externalId: string; title: string }[] }[];
	}) => {
		console.log({ providers });
		const allCollections = providers?.flatMap((p) =>
			p.collection.map((c) => ({ id: c.externalId, label: c.title, providerName: p.name }))
		);
		console.log({ allCollections });
		return allCollections;
	};
	const utils = api.useUtils()

	const { data } = api.item.getAll.useQuery({ search, collectionId }, {
		enabled: true,
		placeholderData: (prev) => prev ?? initialData
	})
	const addItemsHook = api.item.addManyToSLR.useMutation({
		onSuccess: async () => {
			await utils.slr.getItems.invalidate({ id: slrId })
		},
	})

	const addItems = async (selectedItems: RowModel<ItemData>) => { addItemsHook.mutate({ relevance, ids: selectedItems.rows.map(row => row.id), slrId }) }

	const [relevance, setRelevance] = useState<Relevance>("UNKNOWN")

	return <>
		<Search allCollections={providers ? getAllCollectionsFromProviders({ providers: providers }) : [{ id: "x", label: "y" }]} setSearch={setSearch} search={search} collectionId={collectionId} setCollectionId={setCollectionId} />
		<ItemTable isLoading={addItemsHook.isPending} action={addItems} data={data!} search={search} />
		<Fieldset className="mt-4">
			<Field>
				<Label>Relevance</Label>
				<Select name="country" onChange={(e) => { setRelevance(e.target.value as Relevance) }} value={relevance}>
					<option value={"UNKNOWN"}> Unknown </option>
					<option value={"IRRELEVANT"}> Irrelevant</option>
					<option value={"RELEVANT"}> Relevant</option>
				</Select>
				<Description>Determine weither the added items are relevant or irrelevant to the SLR.</Description>
			</Field>
		</Fieldset>
	</>
}
