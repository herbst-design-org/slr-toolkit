import { redirect } from "next/navigation";
import { Button } from "~/app/_components/button";
import CustomNavbar from "~/app/_components/custom-navbar";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "~/app/_components/description-list";
import { Divider } from "~/app/_components/divider";
import { Subheading } from "~/app/_components/heading";
import { Text } from "~/app/_components/text";
import { api } from "~/trpc/server";
import AddItems from "./AddItems";

export default async function SLRPage({ params }: { params: { id: string } }) {
  const slr = await api.slr.getById({ id: params.id });
  const providers = await api.contentProvider.getAll();
  if (!slr) redirect("/");
  return (
    <CustomNavbar title={slr?.title ?? "unknown"}>
      <DescriptionList>
        <DescriptionTerm> #Items </DescriptionTerm>
        <DescriptionDetails> {slr._count.items} </DescriptionDetails>
        <DescriptionTerm> #Participants</DescriptionTerm>
        <DescriptionDetails> {slr._count.participants + 1} </DescriptionDetails>
        <DescriptionTerm> Owner</DescriptionTerm>
        <DescriptionDetails> {slr.createdBy.name} </DescriptionDetails>
      </DescriptionList>
      <div className="my-12"> </div>
      <AddItems providers={providers} />
        <div>
          {" "}
          <Text>items </Text>
        </div>
    </CustomNavbar>
  );
}
