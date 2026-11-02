import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F6F2] text-[#191820] p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#EAE7F2] shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#E9E5FF] text-[#6C5CE7] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Compass className="w-8 h-8 text-[#6C5CE7]" />
        </div>
        <h2 className="text-2xl font-black text-[#191820]">Page Not Found</h2>
        <p className="text-xs text-[#6B6A78] mt-2 mb-6">
          The room or page you are looking for does not exist or has ended.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF7417] hover:bg-[#e6640e] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
