"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ErrorMessage,
  Field,
  FieldGroup,
  Fieldset,
  Label,
} from "../_components/fieldset";
import { Input } from "../_components/input";
import { Divider } from "../_components/divider";
import { api } from "~/trpc/react";
import { notify } from "../_components/toast";
import LoadingButton from "../_components/loading-button";

const CreateSLRSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});
type CreateSLRType = z.infer<typeof CreateSLRSchema>;

export default function CreateSLR({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: () => void;
}): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSLRType>({
    resolver: zodResolver(CreateSLRSchema),
  });

  const apiUtil = api.useUtils();
  const createSLR = api.slr.create.useMutation({
    onSuccess: async () => {
      notify({ message: "Systematic Literature Review created succesfully" });
      await apiUtil.slr.getAll.invalidate();
      onSuccess();
    },
    onError: (error) => {
      notify(error);
      onError();
    },
  });

  const onSubmit = (data: CreateSLRType) => {
    createSLR.mutate(data);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Fieldset>
          <FieldGroup>
            <Field>
              <Label>Title</Label>
              <Input {...register("title")} invalid={errors.title != null} />
              {errors.title && (
                <ErrorMessage>{errors.title.message}</ErrorMessage>
              )}
            </Field>
            <Field>
              <Label>Description</Label>
              <Input
                {...register("description")}
                invalid={errors.title != null}
              />
              {errors.description && (
                <ErrorMessage>{errors.description.message}</ErrorMessage>
              )}
            </Field>
          </FieldGroup>
        </Fieldset>
        <Divider className="my-4" />
        <LoadingButton
          className="w-full"
          loading={createSLR.isPending}
          type="submit"
        >
          Create SLR
        </LoadingButton>
      </form>
    </>
  );
}
