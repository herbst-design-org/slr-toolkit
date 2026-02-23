
import React, { useCallback, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "../_components/alert";
import { Badge } from "../_components/badge";
import { Button } from "../_components/button";
import { Divider } from "../_components/divider";
import { Field, Label } from "../_components/fieldset";
import { Heading, Subheading } from "../_components/heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../_components/table";
import { Text } from "../_components/text";
import { Textarea } from "../_components/textarea";
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";

type BibUpload = {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  text: string;
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type Props = {
  name: string; // RHF field name (e.g. "uploads")
};

export default function BibFileUpload({ name }: Props) {
  const { setValue } = useFormContext(); // 👈 RHF integration

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [uploads, setUploads] = useState<BibUpload[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.readAsText(file);
    });

  const syncToForm = (next: BibUpload[]) => {
    setUploads(next);
    setValue(name, next, { shouldDirty: true, shouldValidate: true }); // 👈 push to RHF
  };

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;

    const bibFiles = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".bib")
    );

    const results = await Promise.all(
      bibFiles.map(async (file) => ({
        id: uid(),
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        text: await readFileAsText(file),
      }))
    );

    const next = [...uploads, ...results];

    syncToForm(next);

    if (!activeId && next.length) setActiveId(next[0].id);
  }, [uploads, activeId]);

  const remove = (id: string) => {
    const next = uploads.filter((u) => u.id !== id);
    syncToForm(next);

    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const active = uploads.find((u) => u.id === activeId);

  return (
    <div className="grid gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".bib"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Button onClick={() => inputRef.current?.click()}>
        Select .bib files
      </Button>

      {uploads.map((u) => (
        <div key={u.id} className="flex items-center justify-between border p-2 rounded-xl">
          <span>{u.name}</span>
          <Button outline onClick={() => remove(u.id)}>
            Remove
          </Button>
        </div>
      ))}

      {active && (
        <Textarea readOnly value={active.text} className="min-h-[200px]" />
      )}
    </div>
  );
}

