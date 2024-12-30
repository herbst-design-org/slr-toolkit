"use client";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ErrorMessage,
  Field,
  FieldGroup,
  Fieldset,
  Label,
  Legend,
} from "~/app/_components/fieldset";
import { Input } from "~/app/_components/input";
import { Text } from "~/app/_components/text";
import { api } from "~/trpc/react";
import { notify } from "~/app/_components/toast";
import { Select } from "~/app/_components/select";
import LoadingButton from "~/app/_components/loading-button";

const SetupZoteroProviderFormZod = z.object({
  apiKey: z.string().min(10),
  libraryId: z.string().min(4),
  libraryType: z.enum(["user", "group"]),
});

type SetupZoteroProviderFormData = z.infer<typeof SetupZoteroProviderFormZod>;

export default function SetupZoteroProviderForm(): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupZoteroProviderFormData>({
    resolver: zodResolver(SetupZoteroProviderFormZod),
    reValidateMode: "onBlur",
  });
  const createZoteroProvider =
    api.contentProvider.createContentProvider.useMutation({
      onSuccess: () => {
        notify({ message: "Zotero provider setup successfully" });
        window?.location.reload();
      },
      onError: (error) => {
        notify(error);
      },
    });
  const onSubmit = (data: SetupZoteroProviderFormData) => {
    createZoteroProvider.mutate({ ...data, type: "ZOTERO" });
  };

  return (
    <div className="rounded-lg border p-12">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Fieldset>
          <Legend>Setup Zotero Provider</Legend>
          <Text> Data can be found in Zotero settings. </Text>

          <FieldGroup>
            <div className="grid grid-cols-1 gap-4">
              <Field>
                <Label> API Key </Label>
                <Input {...register("apiKey", { required: true })} />
                {errors.apiKey && (
                  <ErrorMessage>{errors.apiKey.message}</ErrorMessage>
                )}
              </Field>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <Label> Library Type </Label>
                    <Select {...register("libraryType")}>
                      <option value="user">User</option>
                      <option value="group">Group</option>
                    </Select>
                  </Field>
                  <Field>
                    <Label> Library ID </Label>
                    <Input {...register("libraryId")} />
                  </Field>
                </div>
              </FieldGroup>
              <LoadingButton
                className="mt-4"
                type="submit"
                loading={createZoteroProvider.isPending}
              >
                Submit
              </LoadingButton>
            </div>
          </FieldGroup>
        </Fieldset>
      </form>
    </div>
  );
}
