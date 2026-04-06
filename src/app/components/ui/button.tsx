import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border border-black uppercase tracking-wider font-bold",
  {
    variants: {
      variant: {
        default: "bg-[#000000] text-[#FFFFFF] hover:bg-[#00FF00] hover:text-[#000000]",
        destructive:
          "bg-[#FF0000] text-white hover:bg-[#CC0000] border-[#FF0000]",
        outline:
          "border-[#000000] bg-[#FFFFFF] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]",
        secondary:
          "bg-[#D4D0C8] text-[#000000] hover:bg-[#000000] hover:text-[#FFFFFF]",
        ghost:
          "hover:bg-[#000000] hover:text-[#FFFFFF] border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
