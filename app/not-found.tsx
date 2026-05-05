import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-7xl font-bold">404</h1>
      <p className="mt-2 text-xl text-muted-foreground">Página não encontrada</p>
      <Button asChild className="mt-6" variant="gradient">
        <Link href="/">Voltar para o início</Link>
      </Button>
    </div>
  );
}
