import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./classnames";

export function TableRoot({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white",
        className,
      )}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <table
      className={cn("w-full table-fixed border-separate border-spacing-0", className)}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("sticky top-0 z-10", className)} {...props} />;
}

export function TableBody(props: ComponentPropsWithoutRef<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return <tr className={className} {...props} />;
}

export function TableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("h-11 border-b border-slate-100 px-2", className)}
      {...props}
    />
  );
}

export function TableHeadStaticCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn("h-10 border-b border-slate-200 bg-white px-2", className)}
      scope="col"
      {...props}
    />
  );
}
