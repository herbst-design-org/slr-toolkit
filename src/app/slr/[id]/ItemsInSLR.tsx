"use client"
import { AnimatePresence, motion } from "framer-motion";
import LoadingButton from "~/app/_components/loading-button"
import { type SLR } from "@prisma/client"
import { useState, type ReactElement } from "react"
import ItemTable, { type ItemData } from "./ItemTable"
import { api, type RouterOutputs } from "~/trpc/react"
import { Subheading } from "~/app/_components/heading"
import { type RowModel } from "@tanstack/react-table"
import { Text } from "~/app/_components/text"
import { Badge } from "~/app/_components/badge"
import QuickClassify from "~/app/_components/quick-classify"
import { Button } from "~/app/_components/button"

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
	const utils = api.useUtils()
	const removeUnknownItemsHook = api.slr.removeItems.useMutation({
		onSuccess: async () => {
			setResult([])
			await utils.slr.getItems.invalidate({ id: slr.id, relevance: "UNKNOWN" })
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
	const removeFromResult = async ({ itemId }: { itemId: string }) => {
		setResult((prev) => {
			return prev.filter((item) => item.id !== itemId)
		})
		await utils.slr.getItems.invalidate({ id: slr.id })
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
			{result.length ? (
				<>
					<motion.div
						className="mt-2 custom-scrollbar max-h-[500px] flex-col flex gap-4 overflow-y-scroll"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						<AnimatePresence>
							{result.map((r, i) => (
								<motion.div
									key={r.id}
									className="justify-between flex items-center gap-2"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									transition={{ duration: 0.2, delay: i * 0.03 }}
								>
									<div className="flex gap-2 items-center">
										<Badge>{r.probabilities?.[1]?.toFixed(2)}</Badge>
										<a href={r.link}>
											<Text>{r.title}</Text>
										</a>
									</div>
									<QuickClassify itemId={r.id} slrId={slr.id} removeFromResult={removeFromResult} />
								</motion.div>
							))}
						</AnimatePresence>
					</motion.div>
					<LoadingButton
						loading={removeUnknownItemsHook.isPending}
						className="mt-1 w-full"
						onClick={() =>
							removeUnknownItemsHook.mutate({
								itemIds: result.map((r) => r.id),
								slrId: slr.id,
							})
						}
					>
						Reset Unknown
					</LoadingButton>
				</>
			) : (
				<Text>No items classified yet</Text>
			)}
		</div>
	</div>
}

