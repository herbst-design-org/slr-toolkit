"use client";
import { type ContentProvider } from "@prisma/client";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Button } from "~/app/_components/button";
import { Dialog, DialogBody } from "~/app/_components/dialog";
import { Divider } from "~/app/_components/divider";
import { Subheading } from "~/app/_components/heading";
import { Text } from "~/app/_components/text";
import Tree, { type CollectionResponse } from "~/app/_components/tree";
import { api } from "~/trpc/react";
import SearchItemTableWrapper from "./SearchItemTableWrapper";
import LoadingButton from "~/app/_components/loading-button";

export default function AddItems({
  providers,
  slrId,
}: {
  providers: ContentProvider[];
  slrId: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string | undefined>();
  const { data: collection, refetch: refetchCollections } =
    api.contentProvider.getCollections.useQuery(
      { providerId: providerId! },
      { enabled: !!providerId },
    );
  const createCollectionsHook = api.item.createCollections.useMutation({
    onSettled: async () => {
      await refetchCollections();
    },
  });
  const onSubmit = async (selectedCollections: string[]) => {
    if (!providerId) return;
    createCollectionsHook.mutate({
      providerId,
      externalIds: selectedCollections,
    });
  };
  const updateCollectionsHook = api.item.updateCollections.useMutation();
  const updateCollections = () => {
    updateCollectionsHook.mutate();
  };
  return (
    <div>
      <Dialog onClose={() => setOpen(false)} open={open}>
        <DialogBody>
          {" "}
          {collection && (
            <Tree
              selectedCollections={collection.prev}
              onSubmit={onSubmit}
              data={collection.all}
            />
          )}
        </DialogBody>
      </Dialog>
      <Subheading> Manage Collection Subscriptions</Subheading>
      <Divider  />

      <div className="p-8 flex gap-4 flex-wrap border-l border-zinc-800 ">
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
        <LoadingButton
          onClick={() => updateCollections()}
          loading={updateCollectionsHook.isPending}
          disabled={updateCollectionsHook.isPending}
          outline
        >
          {" "}
          Update{" "}
        </LoadingButton>
      </div>
    </div>
  );
}
