import { KeyIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { type Dispatch, type SetStateAction, type ReactElement } from "react"
import { Input, InputGroup } from "~/app/_components/input"

export default function Search({ search, setSearch, collectionId, setCollectionId }: { search: string, setSearch: Dispatch<SetStateAction<string>>, collectionId?: string, setCollectionId: Dispatch<SetStateAction<string | undefined>> }): ReactElement {

  return (
    <div className="grid grid-cols-6 w-full gap-4 mb-4">
      <div className="col-span-3"></div>
      <div className="col-span-2">
        <InputGroup className="col-span-2">
          <MagnifyingGlassIcon />
          <Input onChange={(e) => { setSearch(e.target.value) }} value={search} />
        </InputGroup>
      </div>
      <InputGroup className="col-span-1">
        <KeyIcon />
        <Input onChange={(e) => { setCollectionId(e.target.value) }} value={collectionId} />
      </InputGroup>
    </div>
  )
}
