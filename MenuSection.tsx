"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { buildWhatsAppLink, categories, menuItems, type MenuCategoryId } from "@/data/business";
import { MENU_CATEGORY_EVENT } from "./Categories";
import Reveal from "./Reveal";

type FilterId = "all" | MenuCategoryId;

const currency = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export default function MenuSection() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<MenuCategoryId>;
      if (custom.detail) setActiveFilter(custom.detail);
    };
    window.addEventListener(MENU_CATEGORY_EVENT, handler);
    return () => window.removeEventListener(MENU_CATEGORY_EVENT, handler);
  }, []);

  const filters: { id: FilterId; label: string }[] = useMemo(
    () => [{ id: "all", label: "All Items" }, ...categories.map((c) => ({ id: c.id, label: c.label }))],
    [],
  );

  const visibleItems = useMemo(
    () => (activeFilter === "all" ? menuItems : menuItems.filter((item) => item.category === activeFilter)),
    [activeFilter],
  );

  return (
    <section id="menu" className="relative bg-charcoal-950 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-flame-400">Our Menu</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">Featured Dishes</h2>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <p className="max-w-sm text-sm leading-relaxed text-cream-200/60">
              A sample of our most-loved items. Prices shown are indicative sample figures for this design
              concept — please confirm current pricing directly with Nanna Foods.
            </p>
          </Reveal>
        </div>

        <div
          role="tablist"
          aria-label="Menu categories"
          className="scrollbar-none mt-10 flex gap-2 overflow-x-auto pb-2"
        >
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                activeFilter === filter.id
                  ? "border-flame-500 bg-flame-600 text-cream-50"
                  : "border-cream-100/15 bg-charcoal-900 text-cream-200/80 hover:border-flame-500/60 hover:text-flame-400"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item, index) => (
            <Reveal key={item.id} delay={(index % 3) * 100}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-cream-100/10 bg-charcoal-900 transition-transform duration-300 hover:-translate-y-1.5 hover:border-flame-500/40">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {item.popular && (
                    <span className="absolute left-3 top-3 rounded-full bg-flame-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cream-50">
                      Popular
                    </span>
                  )}
                  {item.spicy && (
                    <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-950/80 text-base" aria-label="Spicy">
                      🌶️
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-bold text-cream-50">{item.name}</h3>
                    <span className="whitespace-nowrap font-display text-lg font-bold text-flame-400">
                      {currency.format(item.price)}
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-cream-200/65">{item.description}</p>
                  <a
                    href={buildWhatsAppLink(`Hi! I'd like to order: ${item.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-flame-400 transition-colors hover:text-flame-300"
                  >
                    Order on WhatsApp
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-cream-200/40">
          * Sample menu for demonstration. Items and prices are placeholders pending confirmation by Nanna Foods.
        </p>
      </div>
    </section>
  );
}
