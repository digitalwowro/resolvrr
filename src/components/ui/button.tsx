import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
};

export function Button({
  variant = "secondary",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantClass[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}
