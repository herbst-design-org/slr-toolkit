import { redirect } from "next/navigation";
import CustomNavbar from "~/app/_components/custom-navbar";
import { api } from "~/trpc/server";
import AddItems from "./AddItems";
import SlrInfo from "./SlrInfo";
import ItemsInSLR from "./ItemsInSLR";

export default async function SLRPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const slr = await api.slr.getById({ id });
  const providers = await api.contentProvider.getAll();
  if (!slr) redirect("/");
  return (
    <CustomNavbar title={slr?.title ?? "unknown"}>
      <SlrInfo slr={slr} />
      <div className="my-12"> </div>
      <AddItems slrId={slr.id} providers={providers} />
      <ItemsInSLR slr={slr} />
    </CustomNavbar>
  );
}
