
import { BibtexForm } from "./BibtexForm";
import { type ReactElement } from "react";
import CustomNavbar from "../_components/custom-navbar";

export default async function SLRPage(): Promise<ReactElement> {
  return (
    <CustomNavbar title="Import from BibTeX">
<BibtexForm />
     </CustomNavbar>
  );
}




