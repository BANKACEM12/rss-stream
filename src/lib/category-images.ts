import business from "@/assets/category-business.jpg";
import culture from "@/assets/category-culture.jpg";
import science from "@/assets/category-science.jpg";
import sports from "@/assets/category-sports.jpg";
import tech from "@/assets/category-tech.jpg";
import world from "@/assets/category-world.jpg";

import type { Category } from "@/lib/i18n";

/** Professional editorial fallback photo per section, used when an article has no image. */
export const CATEGORY_IMAGES: Record<Category, string> = {
  world,
  business,
  tech,
  sports,
  science,
  culture,
};

export function categoryImage(category: string): string {
  return CATEGORY_IMAGES[category as Category] ?? world;
}
