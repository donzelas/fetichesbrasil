import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getViewer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer.isAuthenticated) {
    redirect(viewer.isAdmin ? "/admin" : "/");
  }

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-bold text-xl"
        >
          <Sparkles className="h-7 w-7 text-primary" />
          Fetiches <span className="text-primary">Brasil</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
