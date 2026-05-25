import Link from "next/link";
import type { ReactNode } from "react";

type ConnectionPageShellProps = {
  children: ReactNode;
  title: string;
  description: string;
};

export function ConnectionPageShell({
  children,
  description,
  title,
}: ConnectionPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-indigo-600">Resolvrr</p>
            <h1 className="mt-2 text-2xl text-slate-950">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm">{description}</p>
          </div>
          <Link className="text-sm" href="/workspace">
            Back to workspace
          </Link>
        </div>
        {children}
      </section>
    </main>
  );
}
