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
  | "not-authenticated";

export type MyStyleDataResult = {
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
