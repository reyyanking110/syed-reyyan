import { buildWhatsAppLink, business } from "@/data/business";
import Reveal from "./Reveal";

export default function ContactSection() {
  return (
    <section id="contact" className="relative overflow-hidden bg-charcoal-950 py-20 sm:py-28">
      <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-flame-600/20 blur-[100px]" />
      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-flame-400">Get in Touch</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-5xl">
            Hungry? Let&apos;s get you fed.
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream-200/70">
            Reach out for orders, group platters, or to ask about today&apos;s specials. Our team at Nanna Foods is
            happy to help.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-flame-600 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream-50 shadow-lg shadow-flame-600/30 transition-all hover:-translate-y-0.5 hover:bg-flame-500 sm:text-base"
            >
              Order on WhatsApp
            </a>
            <a
              href={business.location.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-cream-100/30 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream-50 transition-all hover:-translate-y-0.5 hover:border-flame-400 hover:text-flame-400 sm:text-base"
            >
              Get Directions
            </a>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mx-auto mt-8 max-w-md rounded-2xl border border-cream-100/10 bg-charcoal-900 px-5 py-4 text-xs leading-relaxed text-cream-200/50">
            Note: the WhatsApp number used on this demo site is a placeholder and has not yet been confirmed by
            Nanna Foods. {business.contact.phoneDisplay}.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
