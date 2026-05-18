"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  isSubmitting: boolean;
  label?: string;
};

export function SubmitFooter({ isSubmitting, label = "Salvar" }: Props) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}
