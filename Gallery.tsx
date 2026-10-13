import Image from "next/image";
import { galleryImages } from "@/data/business";
import Reveal from "./Reveal";

export default function Gallery() {
  return (
    <section id="gallery" className="relative bg-charcoal-900 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-flame-400">Taste the Craft</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-4xl">Food Gallery</h2>
        </Reveal>

        <div className="mt-10 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] sm:grid-cols-4 sm:gap-4">
          {galleryImages.map((image, index) => (
            <Reveal
              key={image.src}
              delay={(index % 4) * 80}
              className={`relative overflow-hidden rounded-2xl border border-cream-100/10 ${
                index === 0 || index === 5 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <div className="group relative h-full w-full">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
