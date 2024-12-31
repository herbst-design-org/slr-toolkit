import { type ReactElement } from "react";
import CustomNavbar from "../_components/custom-navbar";
import { api } from "~/trpc/server";
import SlrGrid from "./slrgrid";

export default async function SLRPage(): Promise<ReactElement> {
  const initialData = await api.slr.getAll();
  return (
    <CustomNavbar title="SLR">
      <SlrGrid initialData={initialData} />
    </CustomNavbar>
  );
}
