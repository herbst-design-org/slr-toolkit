"use client"
import { type ReactElement } from "react"
import { Button } from "./button"
import { QuestionMarkCircleIcon, XCircleIcon, CheckCircleIcon } from "@heroicons/react/16/solid"
import { api } from "~/trpc/react"
import { type Relevance } from "@prisma/client"

export default function QuickClassify({ itemId, slrId, removeFromResult }:
	{ itemId: string, slrId: string, removeFromResult: ({ itemId }: { itemId: string }) => void }): ReactElement {
	const updateRelevancyHook = api.item.updateRelevancy.useMutation({
		onSuccess: () => removeFromResult({ itemId })
	})
	const updateRelevance = (relevancy: Relevance) => {
		updateRelevancyHook.mutate({
			itemId, slrId, relevancy
		})
	}
	const removeFromSLRHook = api.slr.removeItems.useMutation({
		onSuccess: () => removeFromResult({ itemId })
	})
	const removeFromSLR = () => {
		removeFromSLRHook.mutate({
			itemIds: [itemId], slrId
		})
	}


	return <div className="flex ">
		<Button plain onClick={removeFromSLR} ><QuestionMarkCircleIcon /> </Button>
		<Button onClick={() => updateRelevance("IRRELEVANT")} plain><XCircleIcon /> </Button>
		<Button onClick={() => updateRelevance("RELEVANT")} plain><CheckCircleIcon /> </Button>
	</div>
}

