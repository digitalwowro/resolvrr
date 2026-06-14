"use client";

import { useEffect, useState, type FormEvent } from "react";
import type {
  LoadMyStyleAction,
  MyStyleActionResult,
  MyStyleData,
  ResetMyStyleAction,
  SaveMyStyleAction,
} from "@/features/ai";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";

export type {
  LoadMyStyleAction,
  ResetMyStyleAction,
  SaveMyStyleAction,
} from "@/features/ai";

const emptyStyle: MyStyleData = {
  audience: "",
  constraints: "",
  preferences: "",
  role: "",
  tone: "",
};

const myStyleMessageText: Record<MyStyleActionResult["code"], string> = {
  "invalid-my-style": "Keep short fields under 160 characters and guidance under 1,000 characters.",
  "my-style-reset": "My Style reset.",
  "my-style-saved": "My Style saved.",
  "not-authenticated": "Sign in again before updating My Style.",
};

function Message({
  message,
}: { message: { ok: boolean; text: string } | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        message.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800",
      )}
      role="status"
    >
      {message.text}
    </p>
  );
}

function Field({
  label,
  name,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  name: keyof MyStyleData;
  onChange(name: keyof MyStyleData, value: string): void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        maxLength={160}
        name={name}
        onChange={(event) => onChange(name, event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  name: keyof MyStyleData;
  onChange(name: keyof MyStyleData, value: string): void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        maxLength={1_000}
        name={name}
        onChange={(event) => onChange(name, event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function WorkspaceSettingsMyStyleForm({
  loadMyStyleAction,
  resetMyStyleAction,
  saveMyStyleAction,
}: {
  loadMyStyleAction?: LoadMyStyleAction;
  resetMyStyleAction?: ResetMyStyleAction;
  saveMyStyleAction?: SaveMyStyleAction;
}) {
  const [style, setStyle] = useState<MyStyleData>(emptyStyle);
  const [message, setMessage] =
    useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loadMyStyleAction) {
      return;
    }
    void loadMyStyleAction().then((result) => setStyle(result.style));
  }, [loadMyStyleAction]);

  function setField(name: keyof MyStyleData, value: string) {
    setStyle((current) => ({ ...current, [name]: value }));
    setMessage(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saveMyStyleAction) {
      return;
    }

    setPending(true);
    void saveMyStyleAction(new FormData(event.currentTarget))
      .then((result) => {
        setStyle(result.data.style);
        setMessage({ ok: result.ok, text: myStyleMessageText[result.code] });
      })
      .finally(() => setPending(false));
  }

  function resetStyle() {
    if (!resetMyStyleAction) {
      return;
    }

    setPending(true);
    void resetMyStyleAction()
      .then((result) => {
        setStyle(result.data.style);
        setMessage({ ok: result.ok, text: myStyleMessageText[result.code] });
      })
      .finally(() => setPending(false));
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-slate-950">My Style</h4>
        <p className="text-sm text-slate-600">
          Personal writing guidance for proofread, rephrase, and future draft AI.
        </p>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field
            label="Role"
            name="role"
            onChange={setField}
            placeholder="Support engineer"
            value={style.role}
          />
          <Field
            label="Audience"
            name="audience"
            onChange={setField}
            placeholder="Technical customers"
            value={style.audience}
          />
          <Field
            label="Tone"
            name="tone"
            onChange={setField}
            placeholder="Concise and warm"
            value={style.tone}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextAreaField
            label="Writing preferences"
            name="preferences"
            onChange={setField}
            placeholder="Prefer short paragraphs and concrete next steps."
            value={style.preferences}
          />
          <TextAreaField
            label="Constraints"
            name="constraints"
            onChange={setField}
            placeholder="Avoid unsupported promises or excessive apology."
            value={style.constraints}
          />
        </div>
        <Message message={message} />
        <div className="flex gap-2">
          <Button
            disabled={!saveMyStyleAction}
            loading={pending}
            type="submit"
            variant="primary"
          >
            Save My Style
          </Button>
          <Button
            disabled={pending || !resetMyStyleAction}
            onClick={resetStyle}
            type="button"
            variant="secondary"
          >
            Reset
          </Button>
        </div>
      </form>
    </section>
  );
}
