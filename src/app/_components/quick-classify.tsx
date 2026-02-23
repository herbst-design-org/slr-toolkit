"use client"
import { DropdownButton, Dropdown, DropdownMenu, DropdownItem } from "./dropdown"
import { type ReactElement } from "react"
import { Button } from "./button"
import { QuestionMarkCircleIcon, XCircleIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/16/solid"
import { api } from "~/trpc/react"
import { type Relevance } from "@prisma/client"

export default function QuickClassify({ itemAbstract, itemId, slrId, removeFromResult }:
	{ itemId: string, slrId: string,itemAbstract: string | null,  removeFromResult: ({ itemId }: { itemId: string }) => Promise<void>}): ReactElement {
	const updateRelevancyHook = api.item.updateRelevancy.useMutation({
		onSuccess: () => removeFromResult({ itemId })
	})
	const updateRelevance = async (relevancy: Relevance) => {
    await removeFromResult({ itemId })
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
    <Dropdown>
    <DropdownButton plain > <InformationCircleIcon /> </DropdownButton>
      <DropdownMenu>
      <DropdownItem  disabled><div className="max-w-96 max-h-96 -mr-10 overflow-y-scroll custom-scrollbar"><div className="mr-4">{itemAbstract ?? "No abstract available"}</div></div></DropdownItem>
      </DropdownMenu>
    </Dropdown>
		<Button plain onClick={removeFromSLR} ><QuestionMarkCircleIcon /> </Button>
		<Button onClick={() => updateRelevance("IRRELEVANT")} plain><XCircleIcon /> </Button>
		<Button onClick={() => updateRelevance("RELEVANT")} plain><CheckCircleIcon /> </Button>
	</div>
}

