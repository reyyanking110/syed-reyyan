import Image from "next/image";
import { buildWhatsAppLink, business, heroImage } from "@/data/business";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden bg-charcoal-950">
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt="Flame-grilled kebabs cooking over charcoal at Nanna Foods"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/70 to-charcoal-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/90 via-charcoal-950/30 to-transparent" />
        <div className="bg-grain absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-24 pb-16 sm:px-8 sm:pt-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-flame-500/40 bg-charcoal-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-flame-400">
            North Karachi · Nagan Chowrangi
          </span>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.05] text-cream-50">
            Flame-grilled flavour, <span className="text-gradient-flame">made fresh</span> for Karachi
          </h1>
        </Reveal>

        <Reveal delay={220}>
          <p className="font-urdu mt-3 text-2xl text-cream-200/90 sm:text-3xl">{business.nameUr} — ذائقے جو دل جیت لیں</p>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-200/80 sm:text-lg">
            {business.shortDescription}
          </p>
        </Reveal>

        <Reveal delay={420}>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#menu"
              className="inline-flex items-center gap-2 rounded-full bg-flame-600 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream-50 shadow-lg shadow-flame-600/30 transition-all hover:-translate-y-0.5 hover:bg-flame-500 sm:text-base"
            >
              View Menu
            </a>
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-cream-100/30 bg-cream-50/5 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream-50 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-flame-400 hover:text-flame-400 sm:text-base"
            >
              Order on WhatsApp
            </a>
          </div>
        </Reveal>

        <Reveal delay={520}>
          <div className="mt-14 flex flex-wrap gap-8 border-t border-cream-100/10 pt-7">
            {[
              { label: "Signature", value: "BBQ & Broast" },
              { label: "Style", value: "Karachi Street Food" },
              { label: "Serving", value: "Dine-in & Takeaway" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-[0.2em] text-cream-200/50">{item.label}</p>
                <p className="mt-1 font-display text-lg font-semibold text-cream-50">{item.value}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
