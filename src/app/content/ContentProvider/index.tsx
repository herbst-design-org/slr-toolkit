import { ContentProviderType } from "@prisma/client";
import { type ReactElement } from "react";
import SetupContentProviderForm from "./SetupContentProviderForm";
import ContentProviderData from "./ContentProviderData";

interface Props {
  type: ContentProviderType;
  isSetup: boolean;
}

export default function ContentProvider({
  type,
  isSetup,
}: Props): ReactElement {
  return (
    <>
      {isSetup ? (
        <ContentProviderData type={type} />
      ) : (
        <SetupContentProviderForm type={type} />
      )}
    </>
  );
}
