"use client"
import BasicTable, { createSelectColumn } from "~/app/_components/basic-table";
import { useMemo, useState } from "react";

import { type ReactElement } from "react"
import { api } from "~/trpc/react";
import { Input } from "~/app/_components/input";
import { type RowModel } from "@tanstack/react-table";

export type ItemData = {
  id: string,
  title: string
}

export default function ItemTable({ data, search, action, isLoading }: { action: (selectedItems: RowModel<ItemData>) => Promise<void>,isLoading: boolean,  search: string, data: { id: string, title: string }[] }): ReactElement {
  const columns = useMemo(
    () => [
      createSelectColumn<ItemData>(),
      {
        accessorKey: "id", // Accessor key for the "name" field from data object
        header: "id", // Column header
      },
      {
        accessorKey: "title", // Accessor key for the "name" field from data object
        header: "Titel", // Column header
      },


    ],
    []
  );



  return <><BasicTable columns={columns} data={data || []} onAccept={{isLoading, buttonText: "Add Selected", action: action }} /></>
}
