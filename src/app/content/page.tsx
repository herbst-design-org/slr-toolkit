import { type ReactElement } from "react";
import CustomNavbar from "../_components/custom-navbar";
import ContentProvider from "./ContentProvider";
import { api } from "~/trpc/server";
import type { ContentProviderType } from "@prisma/client";
import Tabs from "../_components/tabs";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tabIndex: string }>;
}): Promise<ReactElement> {
  const providers = await api.contentProvider.getAll();

  const { tabIndex } = await searchParams;
  const createProviderList: ContentProviderType[] = [
    "ZOTERO",
    "MENDELEY",
    "ENDNOTE",
  ];

  //tab related data
  const indexParam = Number(tabIndex) || 0;
  const currentTabIndex = isNaN(indexParam) ? 0 : indexParam;
  const existingProvidersTabs = providers.map((provider) => {
    return {
      label: provider.name,
      content: (
        <ContentProvider type={provider.type} providerId={provider.id} />
      ),
    };
  });
  const createProviderTabs = createProviderList.map((provider) => {
    return {
      label: provider,
      content: <ContentProvider type={provider} />,
    };
  });
  const tabsData = [...existingProvidersTabs, ...createProviderTabs];
  return (
    <>
      <CustomNavbar title="Provider">
        <Tabs tabs={tabsData} currentTabIndex={currentTabIndex} />
      </CustomNavbar>
    </>
  );
}
