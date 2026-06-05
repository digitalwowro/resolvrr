type TicketAddLinkManualFieldProps = {
  inputId: string;
  manualTicketId: string;
  onManualTicketIdChange(value: string): void;
  saving: boolean;
};

export function TicketAddLinkManualField({
  inputId,
  manualTicketId,
  onManualTicketIdChange,
  saving,
}: TicketAddLinkManualFieldProps) {
  return (
    <div className="space-y-2">
      <label
        className="block text-xs font-semibold text-slate-700"
        htmlFor={inputId}
      >
        Manual related ticket ID
      </label>
      <input
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        disabled={saving}
        id={inputId}
        onChange={(event) => onManualTicketIdChange(event.currentTarget.value)}
        placeholder="Related ticket ID"
        value={manualTicketId}
      />
    </div>
  );
}
