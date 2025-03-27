import { type SLR } from "@prisma/client";
import { type ReactElement } from "react"

import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "~/app/_components/description-list";
import { type RouterOutputs } from "~/trpc/react";

type R_SlrGetById = RouterOutputs["slr"]["getById"]

export default function SlrInfo({ slr }: { slr: R_SlrGetById }): ReactElement {
  return (
    <>
      {slr && (
        <DescriptionList>
          <DescriptionTerm> #Items </DescriptionTerm>
          <DescriptionDetails> {slr?._count.items} </DescriptionDetails>
          <DescriptionTerm> #Participants</DescriptionTerm>
          <DescriptionDetails> {slr?._count.participants + 1} </DescriptionDetails>
          <DescriptionTerm> Owner</DescriptionTerm>
          <DescriptionDetails> {slr?.createdBy.name} </DescriptionDetails>
        </DescriptionList>
      )}
    </>
  )

}
