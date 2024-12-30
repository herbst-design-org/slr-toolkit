import { type ContentProviderType } from "@prisma/client";
import { type ReactElement } from "react";
import SetupContentProviderForm from "./SetupContentProviderForm";
import ContentProviderData from "./ContentProviderData";

interface Props {
  type: ContentProviderType;
  providerId?: string;
}

export default function ContentProvider({
  type,
  providerId,
}: Props): ReactElement {
  return (
    <>
      {providerId ? (
        <ContentProviderData providerId={providerId} />
      ) : (
        <SetupContentProviderForm type={type} />
      )}
    </>
  );
}
