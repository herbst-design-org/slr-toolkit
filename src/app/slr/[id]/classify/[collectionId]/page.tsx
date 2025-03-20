import CustomNavbar from "~/app/_components/custom-navbar"
import { api } from "~/trpc/server"
import { redirect } from "next/navigation"

export default async function ClassifyCollectionPage({ params }: { params: { id: string, collectionId: string } }) {
	const { id: slrId, collectionId } = await params
	const collection = await api.contentProvider.getCollectionById({ id: collectionId })
	const slr = await api.slr.getById({ id: slrId })
	if (!collection || !slr) redirect("/")


	return <CustomNavbar title="Classification" ><Classification slr={slr} collection={collection}/> </CustomNavbar>
}
