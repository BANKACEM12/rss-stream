import business1 from "@/assets/editorial/business-1.jpg";
import business2 from "@/assets/editorial/business-2.jpg";
import business3 from "@/assets/editorial/business-3.jpg";
import culture1 from "@/assets/editorial/culture-1.jpg";
import culture2 from "@/assets/editorial/culture-2.jpg";
import culture3 from "@/assets/editorial/culture-3.jpg";
import science1 from "@/assets/editorial/science-1.jpg";
import science2 from "@/assets/editorial/science-2.jpg";
import science3 from "@/assets/editorial/science-3.jpg";
import sports1 from "@/assets/editorial/sports-1.jpg";
import sports2 from "@/assets/editorial/sports-2.jpg";
import sports3 from "@/assets/editorial/sports-3.jpg";
import tech1 from "@/assets/editorial/tech-1.jpg";
import tech2 from "@/assets/editorial/tech-2.jpg";
import tech3 from "@/assets/editorial/tech-3.jpg";
import world1 from "@/assets/editorial/world-1.jpg";
import world2 from "@/assets/editorial/world-2.jpg";
import world3 from "@/assets/editorial/world-3.jpg";

import type { Category } from "@/lib/i18n";

/**
 * Original editorial illustrations (generated in-house), 3 per section.
 * Used for ALL on-site imagery — we never hotlink publishers' photos,
 * so there is no copyrighted imagery on the site and no broken images.
 * Selection is deterministic per article (hash of the seed).
 */
const SETS: Record<Category, string[]> = {
  world: [world1, world2, world3],
  business: [business1, business2, business3],
  tech: [tech1, tech2, tech3],
  sports: [sports1, sports2, sports3],
  science: [science1, science2, science3],
  culture: [culture1, culture2, culture3],
};

export function categoryImage(category: string, seed = ""): string {
  const set = SETS[category as Category] ?? SETS.world;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return set[h % set.length] ?? set[0]!;
}
