import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/current-user";
import { loginAction } from "@/features/auth";
import { loginErrorMessage, searchParamValue } from "@/features/auth/messages";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/workspace");
  }

  const error = loginErrorMessage(await searchParamValue(searchParams, "error"));

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-sm">
        <p className="text-sm text-indigo-600">Resolvrr</p>
        <h1 className="mt-3 text-2xl tracking-normal text-slate-950">
          Sign in
        </h1>
        <form action={loginAction} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-slate-800" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>
          <div>
            <label
              className="text-sm text-slate-800"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <button
            className="h-10 w-full rounded-md border border-indigo-600 bg-indigo-600 px-3 text-sm text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            type="submit"
          >
            Sign in
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          New to Resolvrr?{" "}
          <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
