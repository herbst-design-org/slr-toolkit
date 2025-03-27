"use client"
import { type ReactElement } from "react"
import { Button } from "./button"
import { QuestionMarkCircleIcon, XCircleIcon, CheckCircleIcon } from "@heroicons/react/16/solid"

export default function QuickClassify({ itemId, slrId }: { itemId: string, slrId: string }): ReactElement {

  return <div className="flex ">
    <Button plain ><QuestionMarkCircleIcon /> </Button>
    <Button plain><XCircleIcon /> </Button>
    <Button plain><CheckCircleIcon /> </Button>
  </div>
}
