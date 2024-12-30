import type { ContentProviderType } from "@prisma/client";
import { type ReactElement } from "react";
import SetupZoteroProviderForm from "./SetupZoteroProviderForm";

interface Props {
  type: ContentProviderType;
}

export default function SetupContentProviderForm({
  type,
}: Props): ReactElement {
  switch (type) {
    case "ZOTERO":
      return (
        <div className="p-4 lg:p-12 xl:p-24">
          <SetupZoteroProviderForm />
        </div>
      );
    case "MENDELEY":
      return <>setup Mendeley</>;
    case "ENDNOTE":
      return <>setup Endnote</>;
  }
}
