"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const OPTIONS = [
  { value: 1, label: "24h" },
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

export function AnalyticsRangeSelector({ current }: { current: number }) {
  const router = useRouter();
  return (
    <div className="flex gap-1 rounded-lg border border-border/50 bg-card/40 p-1">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant="ghost"
          onClick={() => router.push(`/admin/analytics?days=${o.value}`)}
          className={cn(
            "h-7 px-3 text-xs",
            current === o.value && "bg-primary/15 text-primary"
          )}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
