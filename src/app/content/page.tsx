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
  const providerMeta = await api.contentProvider.getMeta();
  const { tabIndex } = await searchParams;
  const allProviders: ContentProviderType[] = ["ZOTERO", "MENDELEY", "ENDNOTE"];

  //tab related data
  const indexParam = Number(tabIndex) || 0;
  const currentTabIndex = isNaN(indexParam) ? 0 : indexParam;
  const tabsData = allProviders.map((provider) => {
    return {
      label: provider,
      content: (
        <ContentProvider
          type={provider}
          isSetup={providerMeta.setUpProviders.includes(provider)}
        />
      ),
    };
  });

  return (
    <>
      <CustomNavbar title="Content">
        <Tabs tabs={tabsData} currentTabIndex={currentTabIndex} />
      </CustomNavbar>
    </>
  );
}
