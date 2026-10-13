"use client";

import { useEffect, useState } from "react";
import { buildWhatsAppLink, business } from "@/data/business";

const navLinks = [
  { href: "#menu", label: "Menu" },
  { href: "#gallery", label: "Gallery" },
  { href: "#about", label: "About" },
  { href: "#location", label: "Location" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled || isOpen
          ? "bg-charcoal-950/95 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur"
          : "bg-gradient-to-b from-charcoal-950/80 to-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-flame-500/60 bg-charcoal-900 text-lg">
            🔥
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-wide text-cream-50 sm:text-2xl">
              Nanna Foods
            </span>
            <span className="font-urdu text-sm text-flame-400">{business.nameUr}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wide text-cream-200/90 transition-colors hover:text-flame-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <a
            href={buildWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-flame-600 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-lg shadow-flame-600/20 transition-all hover:-translate-y-0.5 hover:bg-flame-500"
          >
            Order on WhatsApp
          </a>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-cream-200/20 md:hidden"
        >
          <span
            className={`h-0.5 w-5 rounded-full bg-cream-100 transition-all ${isOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`h-0.5 w-5 rounded-full bg-cream-100 transition-all ${isOpen ? "opacity-0" : ""}`} />
          <span
            className={`h-0.5 w-5 rounded-full bg-cream-100 transition-all ${isOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      <div
        className={`grid overflow-hidden px-5 transition-all duration-300 md:hidden ${
          isOpen ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <nav className="flex flex-col gap-1 border-t border-cream-100/10 pt-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-cream-100 transition-colors hover:bg-charcoal-800 hover:text-flame-400"
              >
                {link.label}
              </a>
            ))}
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-flame-600 px-5 py-3 text-sm font-semibold text-cream-50"
            >
              Order on WhatsApp
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
