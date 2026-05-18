import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
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
          className="mb-8 flex items-center justify-center gap-3 font-bold text-xl"
        >
          <Image
            src="/logo.jpeg"
            alt="Fetiches Brasil"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-lg object-cover"
          />
          Fetiches <span className="text-primary">Brasil</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
