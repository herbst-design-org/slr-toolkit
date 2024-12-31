"use client";
import { type SLR } from "@prisma/client";
import { useState, type ReactElement } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "../_components/button";
import { PlusIcon } from "@heroicons/react/16/solid";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "../_components/dialog";
import CreateSLR from "./create-slr-form";
import { Subheading } from "../_components/heading";
import { Text } from "../_components/text";
import Image from "next/image";
import Link from "next/link";

type AllSlrsReturn = RouterOutputs["slr"]["getAll"];

export default function SlrGrid({
  initialData,
}: {
  initialData: AllSlrsReturn;
}): ReactElement {
  const { data: allSlrs } = api.slr.getAll.useQuery(undefined, { initialData });
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allSlrs.map((slr) => (
          <SlrCard key={slr.id} slr={slr} />
        ))}
        <div className="flex h-32 w-full items-center justify-center">
          <PlusIcon
            className="h-12 w-12 cursor-pointer rounded-md border border-zinc-700 text-zinc-700 transition-all duration-150 hover:scale-105 hover:border-zinc-600 hover:text-zinc-600"
            width={12}
            height={12}
            onClick={() => {
              setOpen(true);
            }}
          />
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add SLR</DialogTitle>
        <DialogBody>
          {" "}
          <CreateSLR
            onSuccess={() => setOpen(false)}
            onError={() => {
              setOpen(false);
            }}
          />{" "}
        </DialogBody>
        <DialogActions>
          {" "}
          <Button onClick={() => setOpen(false)}>Cancel</Button>{" "}
        </DialogActions>
      </Dialog>
    </>
  );
}

const SlrCard = ({ slr }: { slr: SLR }) => {
  return (
<Link href={`/slr/${slr.id}`}>
    <div className="relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-zinc-600 p-4 transition-all duration-150 hover:scale-105">
      <div className="absolute inset-0">
        <Image
          src={
            "https://replicate.delivery/xezq/vuQ9CQW96aqrDNwJidxkXp8zsY1DYmq6zu7YdLfUZy36hNAKA/out-0.jpg"
          }
          alt={slr.title}
          layout="fill"
          objectFit="cover"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />{" "}
      </div>
      <div className="relative z-10">
        <Subheading className="text-lg font-bold">{slr.title}</Subheading>
        <Text>{slr.description}</Text>
      </div>
    </div>
</Link>
  );
};
