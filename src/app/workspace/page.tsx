import { requireCurrentUser } from "@/auth/current-user";
import { logoutAction } from "@/features/auth";

export default async function WorkspacePage() {
  const user = await requireCurrentUser();

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">Resolvrr</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Workspace
            </h1>
          </div>
          <form action={logoutAction}>
            <button
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
        <div className="mt-8 rounded-md border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">
            Signed in as {user.email}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The operational workspace will be assembled after the shared UI
            primitives are approved.
          </p>
        </div>
      </section>
    </main>
  );
}
