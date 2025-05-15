import { KeyIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { type Dispatch, type SetStateAction, type ReactElement } from "react"
import { Field, Label } from "~/app/_components/fieldset"
import { Input, InputGroup } from "~/app/_components/input"
import { Combobox, ComboboxLabel, ComboboxOption, ComboboxDescription } from "~/app/_components/combobox"
import { Badge } from "~/app/_components/badge"

export interface Collection {
  label: string,
  id: string,
  providerName?: string,
}

export default function Search({ search, setSearch, setCollectionId, allCollections = [{ label: "x", id: "y" }] }: { search: string, setSearch: Dispatch<SetStateAction<string>>, collectionId?: string, setCollectionId: Dispatch<SetStateAction<string | undefined>>, allCollections: Collection[] }): ReactElement {




  return (
    <div className="grid grid-cols-8 w-full gap-4 mb-4">
      <div className="col-span-2"></div>
      <div className="col-span-3">
        <InputGroup className="col-span-2">
          <MagnifyingGlassIcon />
          <Input onChange={(e) => { setSearch(e.target.value) }} value={search} />
        </InputGroup>
      </div>

      <div className="col-span-3">
        <Field>
          <Combobox name="collection" options={allCollections} displayValue={(collection) => collection?.label} placeholder="Select Collection..." onChange={(e) => setCollectionId(e?.id)}>
            {(collection) => (
              <ComboboxOption value={collection} >
                <ComboboxLabel>{collection.label} </ComboboxLabel>
                <ComboboxDescription>{collection.providerName}</ComboboxDescription>
              </ComboboxOption>
            )}
          </Combobox>
        </Field>
      </div>
    </div >
  )
}
