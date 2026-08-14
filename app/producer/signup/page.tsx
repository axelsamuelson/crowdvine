import Link from "next/link";
import { getProducerShareSignupContext } from "@/lib/producer-share-account";
import { ProducerSignupForm } from "@/components/producer/producer-signup-form";

export default async function ProducerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const { token: rawToken, next: nextRaw } = await searchParams;
  const token = rawToken?.trim() || "";
  const nextPath =
    nextRaw && nextRaw.startsWith("/") ? nextRaw : "/producer";

  const context = token ? await getProducerShareSignupContext(token) : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md p-6 pt-top-spacing">
        <h1 className="text-2xl font-medium text-gray-900">Create Account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create an account so you can always come back to this status page,
          confirm and update orders, and keep track of your shipments.
        </p>

        {!token || !context ? (
          <p className="mt-6 text-sm text-red-700">
            Open this page from your pallet status link to create an account.
          </p>
        ) : !context.email ? (
          <p className="mt-6 text-sm text-red-700">
            No contact email is set for this producer. Ask CrowdVine to add it
            before creating an account.
          </p>
        ) : (
          <ProducerSignupForm
            token={token}
            nextPath={nextPath}
            email={context.email}
            producerName={context.producerName}
          />
        )}

        {!(token && context?.email) ? (
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href={`/log-in?next=${encodeURIComponent(
                token
                  ? `${nextPath}${nextPath.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
                  : nextPath,
              )}`}
              className="font-medium text-gray-900 underline underline-offset-2"
            >
              Log in
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
