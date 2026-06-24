"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/api";

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/dashboard");
    } else {
      router.replace("/?signin=true");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#030712]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
