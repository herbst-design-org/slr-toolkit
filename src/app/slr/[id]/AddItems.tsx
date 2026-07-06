"use client";
import { type ContentProvider } from "@prisma/client";
import { useState, type ReactElement } from "react";
import { Button } from "~/app/_components/button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/app/_components/dialog";
import { Divider } from "~/app/_components/divider";
import { Subheading } from "~/app/_components/heading";
import { Text } from "~/app/_components/text";
import Tree from "~/app/_components/tree";
import { api } from "~/trpc/react";
import { notify } from "~/app/_components/toast";
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
  const utils = api.useUtils();
  const { data: collection } = api.contentProvider.getCollections.useQuery(
    { providerId: providerId! },
    { enabled: !!providerId },
  );

  const updateCollectionsHook = api.item.updateCollections.useMutation({
    onSuccess: async (data) => {
      if (data.failedProviders.length) {
        notify({
          message: `Sync finished, but these providers failed: ${data.failedProviders.join(", ")}`,
        });
      } else {
        notify({
          message: `Sync complete: ${data.syncedItems} item(s) added or updated`,
        });
      }
      await utils.item.getAll.invalidate();
    },
    onError: (error) => notify({ message: `Sync failed: ${error.message}` }),
  });

  const createCollectionsHook = api.item.createCollections.useMutation({
    onSuccess: async () => {
      setOpen(false);
      notify({ message: "Subscriptions saved, syncing items…" });
      await utils.contentProvider.getCollections.invalidate();
      updateCollectionsHook.mutate();
    },
    onError: (error) =>
      notify({ message: `Saving subscriptions failed: ${error.message}` }),
  });

  const onSubmit = async (selectedCollections: string[]) => {
    if (!providerId || createCollectionsHook.isPending) return;
    createCollectionsHook.mutate({
      providerId,
      externalIds: selectedCollections,
    });
  };

  return (
    <div>
      <Dialog onClose={() => setOpen(false)} open={open}>
        <DialogTitle>Collection subscriptions</DialogTitle>
        <DialogDescription>
          Click the badge next to a collection to subscribe to it (teal =
          subscribed). Saving will import its items and keep them in sync on
          every &quot;Sync items&quot;.
        </DialogDescription>
        <DialogBody>
          {collection && (
            <Tree
              selectedCollections={collection.prev}
              onSubmit={onSubmit}
              submitting={createCollectionsHook.isPending}
              submitLabel="Save subscriptions"
              data={collection.all}
            />
          )}
        </DialogBody>
      </Dialog>
      <Subheading> Manage Collection Subscriptions</Subheading>
      <Divider />

      <div className="flex flex-wrap gap-4 border-l border-zinc-800 p-8">
        {providers.map((p) => {
          return (
            <Button
              onClick={() => {
                setOpen(true);
                setProviderId(p.id);
              }}
              key={p.id}
            >
              {p.name}
            </Button>
          );
        })}
        <LoadingButton
          onClick={() => updateCollectionsHook.mutate()}
          loading={updateCollectionsHook.isPending}
          disabled={updateCollectionsHook.isPending}
          outline
        >
          Sync items
        </LoadingButton>
      </div>
      <Text className="pl-8">
        Pick a provider to choose which collections this account subscribes
        to. &quot;Sync items&quot; fetches new and changed items from all
        subscribed collections.
      </Text>
    </div>
  );
}
