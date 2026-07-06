import * as React from "react"

import { cn } from "@/lib/utils"

function Metric({
  label,
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { label: string; value: string | number }) {
  return (
    <div data-slot="metric" className={cn("flex flex-col", className)} {...props}>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

export { Metric }
