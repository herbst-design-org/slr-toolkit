import { type ReactElement } from "react"
import { Divider } from "~/app/_components/divider"
import { Subheading } from "~/app/_components/heading"
import SearchItemTableWrapper from "./SearchItemTableWrapper"

export default function ManageItems({ slrId }: { slrId: string }): ReactElement {
  return <>
    <SearchItemTableWrapper slrId={slrId} />
  </>
}
