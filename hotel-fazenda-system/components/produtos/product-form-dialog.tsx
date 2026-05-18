"use client";

import { useState } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "@/components/shared/text-field";
import { SubmitFooter } from "@/components/shared/submit-footer";
import { createProduct, updateProduct } from "@/lib/actions/product";
import { createProductSchema } from "@/lib/validations/product";
import type { ProductCategory } from "@prisma/client";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";
import type { z } from "zod";

type FormValues = z.input<typeof createProductSchema>;

const UNITS = [
  { value: "UNIT", label: "Unidade" },
  { value: "KG", label: "Kg" },
  { value: "G", label: "Gramas" },
  { value: "L", label: "Litro" },
  { value: "ML", label: "Mililitro" },
  { value: "PACKAGE", label: "Pacote" },
  { value: "BOX", label: "Caixa" },
] as const;

type Props =
  | { mode: "create"; categories: ProductCategory[]; onDone: () => void }
  | {
      mode: "edit";
      product: ProductWithCategory;
      categories: ProductCategory[];
      onDone: () => void;
    };

export function ProductFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = props.mode === "edit";
  const defaults = getDefaults(props);
  const form = useProductForm(props);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setIsSubmitting(true);
    const payload = {
      name: values.name,
      categoryId: values.categoryId,
      unit: values.unit ?? "UNIT",
      averageCost: values.averageCost ?? 0,
      minimumStock: values.minimumStock ?? 0,
      salePrice: values.salePrice ?? null,
    };
    const result = isEdit
      ? await updateProduct(props.product.id, payload)
      : await createProduct(payload);
    setIsSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setOpen(false);
    form.reset(defaults);
    props.onDone();
  }

  function onOpenChange(next: boolean) {
    if (!next) {
      form.reset(defaults);
      setServerError(null);
      setIsSubmitting(false);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ProductDialogTrigger isEdit={isEdit} />
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Cadastre nome, categoria, unidade e preços. Custo médio é atualizado automaticamente por
            entradas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <ProductFields
            register={form.register}
            errors={form.formState.errors}
            categories={props.categories}
            initialUnit={defaults.unit}
            initialCategoryId={defaults.categoryId}
            setValue={form.setValue}
          />
          {serverError ? (
            <p
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
              role="alert"
            >
              {serverError}
            </p>
          ) : null}
          <SubmitFooter isSubmitting={isSubmitting} label={isEdit ? "Salvar" : "Criar produto"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductDialogTrigger({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogTrigger
      render={
        isEdit ? <Button size="icon-sm" variant="ghost" title="Editar" /> : <Button size="sm" />
      }
    >
      {isEdit ? (
        <Pencil className="h-4 w-4" />
      ) : (
        <>
          <Plus className="h-4 w-4" /> Novo produto
        </>
      )}
    </DialogTrigger>
  );
}

type FieldsProps = {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  categories: ProductCategory[];
  initialUnit: FormValues["unit"];
  initialCategoryId: string;
  setValue: UseFormReturn<FormValues>["setValue"];
};

function ProductFields({
  register,
  errors,
  categories,
  initialUnit,
  initialCategoryId,
  setValue,
}: FieldsProps) {
  return (
    <>
      <TextField
        label="Nome"
        placeholder="Ex: Refrigerante lata"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid grid-cols-2 gap-3">
        <CategorySelect
          categories={categories}
          initial={initialCategoryId}
          onChange={(id) => setValue("categoryId", id, { shouldValidate: true })}
          error={errors.categoryId?.message}
        />
        <UnitSelect
          initial={initialUnit}
          onChange={(u) => setValue("unit", u as FormValues["unit"], { shouldValidate: true })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Custo médio"
          type="number"
          step="0.01"
          min="0"
          error={errors.averageCost?.message}
          {...register("averageCost", { valueAsNumber: true })}
        />
        <TextField
          label="Preço de venda (opcional)"
          type="number"
          step="0.01"
          min="0"
          hint="Usado como default no consumo do hóspede"
          error={errors.salePrice?.message}
          {...register("salePrice", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
        />
      </div>
      <TextField
        label="Estoque mínimo"
        type="number"
        step="0.001"
        min="0"
        hint="0 = sem alerta de estoque baixo"
        error={errors.minimumStock?.message}
        {...register("minimumStock", { valueAsNumber: true })}
      />
    </>
  );
}

function CategorySelect({
  categories,
  initial,
  onChange,
  error,
}: {
  categories: ProductCategory[];
  initial: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Categoria</label>
      <Select defaultValue={initial} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {categories
            .filter((c) => c.isActive)
            .map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

function UnitSelect({
  initial,
  onChange,
}: {
  initial: FormValues["unit"];
  onChange: (u: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Unidade</label>
      <Select defaultValue={initial} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function useProductForm(props: Props): UseFormReturn<FormValues> {
  return useForm<FormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: getDefaults(props),
  });
}

function getDefaults(props: Props): FormValues {
  if (props.mode === "create") {
    return {
      name: "",
      categoryId: props.categories[0]?.id ?? "",
      unit: "UNIT",
      averageCost: 0,
      salePrice: null,
      minimumStock: 0,
    };
  }
  const p = props.product;
  return {
    name: p.name,
    categoryId: p.categoryId,
    unit: p.unit,
    averageCost: Number(p.averageCost),
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    minimumStock: Number(p.minimumStock),
  };
}
