import { business } from "@/data/business";
import Reveal from "./Reveal";

export default function LocationSection() {
  return (
    <section id="location" className="relative bg-charcoal-900 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-flame-400">Find Us</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">Visit Nanna Foods</h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-cream-100/10 bg-charcoal-950 p-7 sm:p-9">
              <div>
                <h3 className="font-display text-2xl font-bold text-cream-50">Address</h3>
                <p className="mt-3 text-base leading-relaxed text-cream-200/75">
                  {business.location.addressLine1}
                  <br />
                  {business.location.addressLine2}
                </p>

                <div className="mt-7 flex items-start gap-3 rounded-2xl border border-cream-100/10 bg-charcoal-900 p-4">
                  <span className="text-xl">📍</span>
                  <p className="text-sm text-cream-200/70">
                    Located near the well-known Nagan Chowrangi landmark — one of North Karachi&apos;s busiest
                    junctions, making it easy to find.
                  </p>
                </div>
              </div>

              <a
                href={business.location.mapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-flame-600 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream-50 transition-all hover:-translate-y-0.5 hover:bg-flame-500"
              >
                Get Directions on Google Maps
              </a>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-3">
            <div className="h-80 overflow-hidden rounded-3xl border border-cream-100/10 sm:h-full">
              <iframe
                title="Nanna Foods location map"
                src={`https://maps.google.com/maps?q=${business.location.mapsEmbedQuery}&z=15&output=embed`}
                className="h-full w-full grayscale-[25%]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
