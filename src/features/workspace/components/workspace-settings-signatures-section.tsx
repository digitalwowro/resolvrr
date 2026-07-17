"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui";
import type { TicketSignatureSource } from "@/core/ticket-signatures";
import type { WorkspaceSignatureSettingsData } from "@/features/signatures";
import { TicketRichTextEditor } from "./ticket-rich-text-editor";
import { useWorkspaceSignatureActions } from "./ticket-signature-preview-action-context";

const sourceOptions: { description: string; label: string; value: TicketSignatureSource }[] = [
  { value: "zammad", label: "Zammad-managed", description: "Render the current Zammad signature for the ticket group and signed-in helpdesk user." },
  { value: "resolvrr", label: "Resolvrr-managed", description: "Use workspace templates maintained here, with optional group overrides." },
  { value: "none", label: "No signature", description: "Do not add an outbound signature." },
];

const variables = [
  "user.displayName", "user.firstName", "user.lastName", "user.email",
  "workspace.name", "ticket.number", "ticket.title",
];

function templateFor(data: WorkspaceSignatureSettingsData, groupExternalId: string) {
  return data.templates.find((template) =>
    (template.groupExternalId ?? "") === groupExternalId,
  );
}

export function WorkspaceSettingsSignaturesSection() {
  const {
    deleteWorkspaceSignatureTemplateAction,
    loadWorkspaceSignatureSettingsAction,
    saveWorkspaceSignatureSourceAction,
    saveWorkspaceSignatureTemplateAction,
  } = useWorkspaceSignatureActions();
  const [data, setData] = useState<WorkspaceSignatureSettingsData>();
  const [groupExternalId, setGroupExternalId] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadWorkspaceSignatureSettingsAction().then((loaded) => {
      setData(loaded);
      setBodyHtml(templateFor(loaded, "")?.bodyHtml ?? "");
    });
  }, [loadWorkspaceSignatureSettingsAction]);

  async function changeSource(source: TicketSignatureSource) {
    if (!data?.canManage) return;
    setPending(true);
    const result = await saveWorkspaceSignatureSourceAction(source);
    setData(result.data);
    setMessage(result.message);
    setPending(false);
  }

  async function saveTemplate() {
    setPending(true);
    const result = await saveWorkspaceSignatureTemplateAction({
      bodyHtml,
      groupExternalId: groupExternalId || undefined,
    });
    setData(result.data);
    setBodyHtml(templateFor(result.data, groupExternalId)?.bodyHtml ?? "");
    setMessage(result.message);
    setPending(false);
  }

  async function deleteTemplate() {
    setPending(true);
    const result = await deleteWorkspaceSignatureTemplateAction({
      groupExternalId: groupExternalId || undefined,
    });
    setData(result.data);
    setBodyHtml(templateFor(result.data, groupExternalId)?.bodyHtml ?? "");
    setMessage(result.message);
    setPending(false);
  }

  function addImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !["image/gif", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Choose a GIF, JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 256 * 1024) {
      setMessage("Signature images must be 256 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBodyHtml((current) => `${current}<p><img alt="" src="${reader.result}"></p>`);
      }
    };
    reader.readAsDataURL(file);
  }

  if (!data) {
    return <div className="p-6 text-sm text-slate-500" role="status">Loading signature settings…</div>;
  }
  const selectedTemplate = templateFor(data, groupExternalId);
  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-6" aria-labelledby="signature-settings-title">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-950" id="signature-settings-title">Outbound signatures</h2>
          <p className="mt-1 text-sm text-slate-600">Choose what agents see and what Resolvrr includes in articles submitted to Zammad.</p>
        </div>
        <fieldset className="grid gap-3" disabled={!data.canManage || pending}>
          <legend className="mb-2 text-sm font-semibold text-slate-900">Signature source</legend>
          {sourceOptions.map((option) => (
            <label className="flex cursor-pointer gap-3 rounded-md border border-slate-200 p-3" key={option.value}>
              <input checked={data.source === option.value} name="signature-source" onChange={() => void changeSource(option.value)} type="radio" />
              <span><span className="block text-sm font-medium text-slate-900">{option.label}</span><span className="block text-xs text-slate-600">{option.description}</span></span>
            </label>
          ))}
        </fieldset>
        {!data.canManage ? <p className="text-sm text-slate-500">Only workspace admins can change signature settings.</p> : null}
        {data.source === "zammad" ? (
          <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-900">Agents will review Zammad’s rendered group signature in the composer before updating a ticket.</p>
        ) : null}
        {data.source === "resolvrr" ? (
          <div className="space-y-4 rounded-md border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-900">Template scope
              <select className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" disabled={pending} onChange={(event) => { const value = event.currentTarget.value; setGroupExternalId(value); setBodyHtml(templateFor(data, value)?.bodyHtml ?? ""); }} value={groupExternalId}>
                <option value="">Default for all groups</option>
                {data.groupOptions.map((group) => <option key={group.externalId} value={group.externalId}>{group.label}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => <Button disabled={!data.canManage || pending} key={variable} onClick={() => setBodyHtml((current) => `${current}<span>{{${variable}}}</span>`)} type="button" variant="secondary">{`{{${variable}}}`}</Button>)}
              <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Add image<input accept="image/gif,image/jpeg,image/png,image/webp" className="sr-only" disabled={!data.canManage || pending} onChange={addImage} type="file" /></label>
            </div>
            <TicketRichTextEditor contentKind="signature" disabled={!data.canManage || pending} id="workspace-signature-template" label="Signature template" onChange={setBodyHtml} placeholder="Create a signature template…" value={bodyHtml} />
            <div className="flex gap-2">
              <Button disabled={!data.canManage || pending} onClick={() => void saveTemplate()} type="button" variant="primary">Save template</Button>
              {selectedTemplate ? <Button disabled={!data.canManage || pending} onClick={() => void deleteTemplate()} type="button" variant="secondary">Remove override</Button> : null}
            </div>
          </div>
        ) : null}
        {message ? <p className="text-sm text-slate-600" role="status">{message}</p> : null}
      </div>
    </section>
  );
}
