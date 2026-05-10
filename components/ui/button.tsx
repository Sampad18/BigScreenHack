import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6FFF00]/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#6FFF00] text-[#010828] hover:bg-[#6FFF00]/90 shadow-lg shadow-[#6FFF00]/20 font-semibold",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-white/15 bg-transparent text-[#EFF4FF] hover:bg-white/10",
        ghost: "text-[#EFF4FF]/60 hover:bg-white/10 hover:text-[#EFF4FF]",
        success: "bg-[#6FFF00] text-[#010828] hover:bg-[#6FFF00]/90 shadow-lg shadow-[#6FFF00]/20 font-semibold",
        secondary: "bg-white/10 text-[#EFF4FF] hover:bg-white/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
