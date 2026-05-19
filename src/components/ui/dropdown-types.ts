import type { ReactNode } from "react";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};
