"use client"
import { type Collection, type SLR } from "@prisma/client"
import { type ReactElement } from "react"
import { api } from "~/trpc/react"

export default function Classification({ slr, collection }: { slr: SLR, collection: Collection }): ReactElement {
	const { data: classificationResult } = api.slr.classifyCollection.useQuery({
		selectedCollection: collection.id,
		slrId: slr.id
	})
	
	
	return <></>
}
