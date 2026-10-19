import { cn } from "@/lib/utils";

type Props = {
  label: string;
  variant: "leaderboard" | "in-article" | "sidebar" | "footer";
  className?: string;
};

/** Fixed-height ad placeholders so nothing shifts while loading (CLS = 0).
 *
 * INTENTIONALLY UNUSED until Google AdSense approves the site — empty
 * "advertisement" boxes hurt the professional look and the review.
 * Re-add <AdSlot> usages (homepage, category, article, layout, static
 * pages) once AdSense issues real ad units.
 */
const SIZES: Record<Props["variant"], string> = {
  // Hidden on phones: an empty 90px box pushes the news below the first screen.
  leaderboard: "hidden md:flex h-[90px]",
  "in-article": "hidden md:flex h-[250px]",
  sidebar: "h-[600px]",
  footer: "hidden md:flex h-[60px]",
};

export function AdSlot({ label, variant, className }: Props) {
  return (
    <div
      className={cn("ad-slot w-full rounded-sm", SIZES[variant], className)}
      aria-hidden="true"
      data-ad-slot={variant}
    >
      {label}
    </div>
  );
}
