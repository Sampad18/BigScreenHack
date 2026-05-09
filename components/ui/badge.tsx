import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-600 text-white",
        secondary: "border-zinc-700 bg-zinc-800 text-zinc-300",
        destructive: "border-transparent bg-red-900 text-red-300",
        warning: "border-transparent bg-amber-900 text-amber-300",
        success: "border-transparent bg-emerald-900 text-emerald-300",
        critical: "border-red-800 bg-red-950 text-red-400",
        high: "border-orange-800 bg-orange-950 text-orange-400",
        medium: "border-yellow-800 bg-yellow-950 text-yellow-400",
        low: "border-blue-800 bg-blue-950 text-blue-400",
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
