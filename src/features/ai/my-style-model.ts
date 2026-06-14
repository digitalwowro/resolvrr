export type MyStyleData = {
  audience: string;
  constraints: string;
  preferences: string;
  role: string;
  tone: string;
};

export type MyStyleActionCode =
  | "invalid-my-style"
  | "my-style-reset"
  | "my-style-saved"
  | "no-active-workspace"
  | "my-style-not-editable"
  | "not-authenticated";

export type MyStyleDataResult = {
  activeWorkspace: { id: string; label: string } | null;
  canEdit: boolean;
  style: MyStyleData;
};

export type MyStyleActionResult = {
  code: MyStyleActionCode;
  data: MyStyleDataResult;
  ok: boolean;
};

export type LoadMyStyleAction = () => Promise<MyStyleDataResult>;
export type SaveMyStyleAction = (
  formData: FormData,
) => Promise<MyStyleActionResult>;
export type ResetMyStyleAction = () => Promise<MyStyleActionResult>;

export const emptyMyStyle: MyStyleData = {
  audience: "",
  constraints: "",
  preferences: "",
  role: "",
  tone: "",
};
