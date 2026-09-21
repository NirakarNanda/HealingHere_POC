import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-soft",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-border",
        success: "border-transparent bg-[hsl(var(--success-soft))] text-[hsl(var(--success))] font-semibold",
        pending: "border-transparent bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))] font-semibold",
        syncing: "border-transparent bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue))] font-semibold",
        failed: "border-transparent bg-[hsl(var(--danger-soft))] text-destructive font-semibold",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
