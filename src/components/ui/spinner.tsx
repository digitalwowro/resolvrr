export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span
      aria-label={label}
      className="inline-block size-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
      role="status"
    />
  );
}
