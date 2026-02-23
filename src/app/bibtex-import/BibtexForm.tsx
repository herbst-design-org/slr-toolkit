"use client";

import LoadingButton from "../_components/loading-button";
import { Divider } from "../_components/divider";
import {
  ErrorMessage,
  Field,
  FieldGroup,
  Fieldset,
  Label,
} from "../_components/fieldset";
import { Textarea } from "../_components/textarea";
import { Input } from "../_components/input";
import { api } from "~/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";


const CreateBibtexImportSchema = z.object({
  bibtexData: z.string().min(1, "BibTeX data is required"),
  collectionId: z.string().min(1, "Collection ID is required"),
  collectionTitle: z.string().min(1, "Collection title is required"),
});


type BibtexFormType = z.infer<typeof CreateBibtexImportSchema>;

export const BibtexForm = () => {
  const createByBibTeXHook = api.item.createFromBibtex.useMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BibtexFormType>({
    resolver: zodResolver(CreateBibtexImportSchema),
    defaultValues: {
      collectionId: `collection_bibtex_${Math.random().toString(36).substring(2, 8)}`,
      collectionTitle: 'Abc',
      bibtexData: '',
    },
  });

  const onSubmit = (data: BibtexFormType) => {
    createByBibTeXHook.mutate({...data});
  };

  return(
    <>
<form onSubmit={handleSubmit(onSubmit)}>
        <Fieldset>
          <FieldGroup>
            <Field className="w-lg">
              <Label>Title</Label>
              <Input className="w-96" {...register("collectionTitle")} invalid={errors.collectionTitle!= null} />
              {errors.collectionTitle&& (
                <ErrorMessage>{errors.collectionTitle.message}</ErrorMessage>
              )}
            </Field>
            <Field>
              <Label>Bibtex</Label>
              <Textarea
                {...register("bibtexData")}
                invalid={errors.bibtexData!= null}
                rows={10}
              />
              {errors.bibtexData && (
                <ErrorMessage>{errors.bibtexData.message}</ErrorMessage>
              )}
            </Field>
          </FieldGroup>
        </Fieldset>
        <Divider className="my-4" />
        <LoadingButton
          className="w-full"
          loading={createByBibTeXHook.isPending}
          type="submit"
        >
          Import BibTeX
        </LoadingButton>
      </form>
         </>
  )
}
