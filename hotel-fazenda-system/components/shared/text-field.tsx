import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Material-style text field used across the app.
 * Encapsulates label + input + inline error in a single accessible block.
 */
export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, hint, id, className, ...inputProps },
  ref,
) {
  const fieldId = id ?? inputProps.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  const hintId = hint && fieldId ? `${fieldId}-hint` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={errorId ?? hintId}
        {...inputProps}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
});
