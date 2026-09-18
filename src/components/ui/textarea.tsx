import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      // Browser extensions often inject attributes (e.g. data-prompt-manager-attached)
      // onto form fields before hydration; ignore those mismatches.
      suppressHydrationWarning
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-surface-elevated px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary-active focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
