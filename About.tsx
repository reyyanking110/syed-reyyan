import Image from "next/image";
import { aboutImage, business } from "@/data/business";
import Reveal from "./Reveal";

export default function About() {
  return (
    <section id="about" className="relative bg-charcoal-950 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-cream-100/10 sm:aspect-[4/3] lg:aspect-[4/5]">
            <Image
              src={aboutImage}
              alt="Warm restaurant dining ambience"
              fill
              sizes="(min-width: 1024px) 480px, 90vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-cream-100/10 bg-charcoal-950/80 p-4 backdrop-blur">
              <p className="font-display text-xl font-bold text-flame-400">North Karachi</p>
              <p className="text-sm text-cream-200/70">Serving the neighbourhood near Nagan Chowrangi</p>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-flame-400">Our Story</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">
              {business.about.heading}
            </h2>
          </Reveal>

          <div className="mt-6 space-y-4">
            {business.about.paragraphs.map((paragraph, index) => (
              <Reveal key={index} delay={160 + index * 100}>
                <p className="text-base leading-relaxed text-cream-200/75">{paragraph}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={480}>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-cream-100/10 pt-6">
              {[
                { label: "Flame Grilled", icon: "🔥" },
                { label: "Fresh Daily", icon: "🌿" },
                { label: "Local Favourite", icon: "⭐" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-2xl">{item.icon}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-cream-200/60">{item.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
