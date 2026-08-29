"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-gold/30 bg-navy-mid p-8">
      <h1 className="text-2xl font-black text-cream">Could not load data</h1>
      <p className="mt-2 text-cream/70">
        Check that schema.sql and seed.sql have been run, and that your Supabase
        keys are correct.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-md bg-gold px-4 py-2 font-bold text-navy"
      >
        Try again
      </button>
    </div>
  );
}
