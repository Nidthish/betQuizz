import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
        <h2 className="text-2xl font-black text-white">404 - Page Not Found</h2>
        <p className="text-xs text-zinc-400 mt-2 mb-6">
          The room or page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
