import { redirect } from "next/navigation";
import CustomNavbar from "~/app/_components/custom-navbar";
import { api } from "~/trpc/server";
import ManageSubscriptions from "./AddItems";
import SlrInfo from "./SlrInfo";
import ItemsInSLR from "./ItemsInSLR";
import ManageItems from "./ManageItems";
import { Subheading } from "~/app/_components/heading";
import { Divider } from "~/app/_components/divider";

export default async function SLRPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const slr = await api.slr.getById({ id });
  const providers = await api.contentProvider.getAll();
  if (!slr) redirect("/");
  return (
    <CustomNavbar title={slr?.title ?? "unknown"}>
      <div className="flex flex-grow w-full justify-between border p-8 mb-12 border-zinc-700">
        <div className="md:w-64">
          <Subheading> Stats </Subheading>
          <Divider />
          <SlrInfo slr={slr} />
        </div>
        <ManageSubscriptions slrId={slr.id} providers={providers} />
      </div>
      <ManageItems slrId={slr.id} />
      <ItemsInSLR slr={slr} />
    </CustomNavbar>
  );
}
