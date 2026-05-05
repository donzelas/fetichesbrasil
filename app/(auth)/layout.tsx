import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
