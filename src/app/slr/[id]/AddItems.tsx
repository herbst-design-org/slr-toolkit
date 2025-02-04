"use client";
import { type ContentProvider } from "@prisma/client";
import { useMemo, useState, type ReactElement } from "react";
import { Button } from "~/app/_components/button";
import { Dialog, DialogBody } from "~/app/_components/dialog";
import { Divider } from "~/app/_components/divider";
import { Subheading } from "~/app/_components/heading";
import { Text } from "~/app/_components/text";
import Tree, { type CollectionResponse } from "~/app/_components/tree";
import { api } from "~/trpc/react";

export default function AddItems({
  providers,
}: {
  providers: ContentProvider[];
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string | undefined>();
  console.log({ providerId });
  const { data: collection } = api.contentProvider.getCollections.useQuery(
    { providerId: providerId! },
    { enabled: !!providerId },
  );
  const createCollectionsHook = api.item.createCollections.useMutation();
  const onSubmit = async (selectedCollections: string[]) => {
    if (!providerId) return;
    createCollectionsHook.mutate({
      providerId,
      externalIds: selectedCollections,
    });
  };
  const updateCollectionsHook = api.item.updateCollections.useMutation();
  const updateCollections = () => {
    updateCollectionsHook.mutate()
  }


  return (
    <div>
      <Dialog onClose={() => setOpen(false)} open={open}>
        <DialogBody>
          {" "}
          {collection && <Tree onSubmit={onSubmit} data={collection} />}
        </DialogBody>
      </Dialog>
      <Subheading> Add Items</Subheading>
      <Divider />
      <div className="my-4 flex gap-4">
        {providers.map((p) => {
          return (
            <Button
              onClick={() => {
                setOpen(true);
                setProviderId(p.id);
                console.log("click");
              }}
              key={p.id}
            >
              {" "}
              {p.name}
            </Button>
          );
        })}
        <Button onClick={() => updateCollections()} > Update </Button>
      </div>
    </div>
  );
}
