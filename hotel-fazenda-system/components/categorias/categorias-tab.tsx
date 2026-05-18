"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Pencil, Plus } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ActiveBadge, EmptyMessage, InlineTableError } from "@/components/shared/list-parts";
import { SubmitFooter } from "@/components/shared/submit-footer";
import { TextField } from "@/components/shared/text-field";
import {
  createProductCategory,
  deactivateProductCategory,
  updateProductCategory,
} from "@/lib/actions/product-category";
import { createProductCategorySchema } from "@/lib/validations/product-category";
import { canManageProductCategories } from "@/lib/permissions";
import type { ProductCategory, Role } from "@prisma/client";
import type { z } from "zod";

type FormValues = z.input<typeof createProductCategorySchema>;
type CategoryWithCount = ProductCategory & { _count: { products: number } };

export function CategoriasTab({
  userRole,
  categories,
}: {
  userRole: Role;
  categories: CategoryWithCount[];
}) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const canManage = canManageProductCategories(userRole);

  async function handleDeactivate(category: CategoryWithCount) {
    if (!canDeactivateCategory(category, setTableError)) return;
    setActingId(category.id);
    setTableError(null);
    const result = await deactivateProductCategory(category.id);
    setActingId(null);
    if (!result.success) {
      setTableError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage ? <CategoryFormDialog mode="create" onDone={() => router.refresh()} /> : null}
      </div>
      <InlineTableError message={tableError} />
      <CategoriesTable
        actingId={actingId}
        canManage={canManage}
        categories={categories}
        onDeactivate={handleDeactivate}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

function CategoriesTable({
  actingId,
  canManage,
  categories,
  onDeactivate,
  onDone,
}: {
  actingId: string | null;
  canManage: boolean;
  categories: CategoryWithCount[];
  onDeactivate: (category: CategoryWithCount) => void;
  onDone: () => void;
}) {
  if (categories.length === 0) return <EmptyMessage message="Nenhuma categoria cadastrada." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">Produtos</TableHead>
          <TableHead>Status</TableHead>
          {canManage ? <TableHead className="w-1" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            acting={actingId === category.id}
            canManage={canManage}
            category={category}
            onDeactivate={onDeactivate}
            onDone={onDone}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function CategoryRow({
  acting,
  canManage,
  category,
  onDeactivate,
  onDone,
}: {
  acting: boolean;
  canManage: boolean;
  category: CategoryWithCount;
  onDeactivate: (category: CategoryWithCount) => void;
  onDone: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{category.description ?? "-"}</TableCell>
      <TableCell className="text-right">
        <Badge variant="outline">{category._count.products}</Badge>
      </TableCell>
      <TableCell>
        <ActiveBadge active={category.isActive} />
      </TableCell>
      {canManage ? (
        <TableCell>
          <CategoryActions
            acting={acting}
            category={category}
            onDeactivate={onDeactivate}
            onDone={onDone}
          />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function CategoryActions({
  acting,
  category,
  onDeactivate,
  onDone,
}: {
  acting: boolean;
  category: CategoryWithCount;
  onDeactivate: (category: CategoryWithCount) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <CategoryFormDialog mode="edit" category={category} onDone={onDone} />
      {category.isActive && category._count.products === 0 ? (
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={acting}
          onClick={() => onDeactivate(category)}
          title="Inativar"
        >
          {acting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="text-destructive h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}

type DialogProps =
  | { mode: "create"; onDone: () => void }
  | { mode: "edit"; category: ProductCategory; onDone: () => void };

function CategoryFormDialog(props: DialogProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = props.mode === "edit";
  const form = useCategoryForm(props);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setIsSubmitting(true);
    const result = isEdit
      ? await updateProductCategory(props.category.id, values)
      : await createProductCategory(values);
    setIsSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setOpen(false);
    form.reset(getDefaults(props));
    props.onDone();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) =>
        handleDialogOpen(next, props, form, setServerError, setIsSubmitting, setOpen)
      }
    >
      <CategoryDialogTrigger isEdit={isEdit} />
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Agrupa produtos para facilitar busca e relatórios.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <CategoryFormFields form={form} />
          <InlineTableError message={serverError} />
          <SubmitFooter isSubmitting={isSubmitting} label={isEdit ? "Salvar" : "Criar categoria"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialogTrigger({ isEdit }: { isEdit: boolean }) {
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
          <Plus className="h-4 w-4" /> Nova categoria
        </>
      )}
    </DialogTrigger>
  );
}

function CategoryFormFields({ form }: { form: UseFormReturn<FormValues> }) {
  return (
    <>
      <TextField
        label="Nome"
        placeholder="Ex: Bebidas, Carnes, Hortifruti"
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">Descrição</label>
        <Textarea
          rows={3}
          placeholder="Opcional"
          aria-invalid={!!form.formState.errors.description?.message}
          {...form.register("description")}
        />
      </div>
    </>
  );
}

function handleDialogOpen(
  next: boolean,
  props: DialogProps,
  form: UseFormReturn<FormValues>,
  setServerError: (value: string | null) => void,
  setIsSubmitting: (value: boolean) => void,
  setOpen: (value: boolean) => void,
) {
  if (!next) {
    form.reset(getDefaults(props));
    setServerError(null);
    setIsSubmitting(false);
  }
  setOpen(next);
}

function canDeactivateCategory(
  category: CategoryWithCount,
  setTableError: (value: string | null) => void,
): boolean {
  if (category._count.products > 0) {
    setTableError(
      `A categoria possui ${category._count.products} produto(s). Inative os produtos antes.`,
    );
    return false;
  }
  return window.confirm(`Inativar a categoria "${category.name}"?`);
}

function useCategoryForm(props: DialogProps): UseFormReturn<FormValues> {
  return useForm<FormValues>({
    resolver: zodResolver(createProductCategorySchema),
    defaultValues: getDefaults(props),
  });
}

function getDefaults(props: DialogProps): FormValues {
  if (props.mode === "create") return { name: "", description: "" };
  return { name: props.category.name, description: props.category.description ?? "" };
}
