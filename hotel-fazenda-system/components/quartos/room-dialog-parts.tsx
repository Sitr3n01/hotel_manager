"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type DialogActionTriggerProps = {
  isEdit: boolean;
  createLabel: string;
};

export function DialogActionTrigger({ isEdit, createLabel }: DialogActionTriggerProps) {
  return (
    <DialogTrigger
      render={
        <Button size={isEdit ? "icon-sm" : "default"} variant={isEdit ? "ghost" : "default"}>
          {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {!isEdit ? <span>{createLabel}</span> : null}
        </Button>
      }
    />
  );
}

export function ServerErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
      role="alert"
    >
      {message}
    </p>
  );
}

export function SubmitFooter({
  isEdit,
  isSubmitting,
  createLabel,
}: DialogActionTriggerProps & { isSubmitting: boolean }) {
  const idleLabel = isEdit ? "Salvar alterações" : createLabel;

  return (
    <DialogFooter>
      <Button type="submit" className="font-medium" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Salvando..." : idleLabel}
      </Button>
    </DialogFooter>
  );
}
