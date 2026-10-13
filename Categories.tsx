"use client";

import Image from "next/image";
import { categories, type MenuCategoryId } from "@/data/business";
import Reveal from "./Reveal";

export const MENU_CATEGORY_EVENT = "nanna:set-menu-category";

export function selectMenuCategory(category: MenuCategoryId) {
  window.dispatchEvent(new CustomEvent(MENU_CATEGORY_EVENT, { detail: category }));
  document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Categories() {
  return (
    <section className="relative border-y border-cream-100/5 bg-charcoal-900 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-flame-400">What we&apos;re known for</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">Popular Categories</h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category, index) => (
            <Reveal key={category.id} delay={index * 80}>
              <button
                type="button"
                onClick={() => selectMenuCategory(category.id)}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-cream-100/10 text-left"
              >
                <Image
                  src={category.image}
                  alt={category.label}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/30 to-transparent transition-opacity group-hover:from-flame-700/70" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-lg font-bold text-cream-50">{category.label}</p>
                  <p className="font-urdu text-sm text-cream-200/80">{category.labelUr}</p>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
