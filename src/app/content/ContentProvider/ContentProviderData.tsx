import { type ReactElement } from "react";
import Tree from "~/app/_components/tree";
import { api } from "~/trpc/server";

interface Props {
  providerId: string;
}

export default async function ContentProviderData({
  providerId,
}: Props): Promise<ReactElement> {
  const collection = await api.contentProvider.getCollections({
    providerId,
  });

  return (
    <>
      {" "}
      <Tree data={collection.all}  />
    </>
  );
}
