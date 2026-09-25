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
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input control-surface px-3 py-2 text-sm transition-[color,background-image,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-primary-active focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-0 aria-invalid:focus-visible:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
