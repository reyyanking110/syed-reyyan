import { business, siteConfig } from "@/data/business";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-cream-100/10 bg-charcoal-900 pb-8 pt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-flame-500/60 text-lg">
                🔥
              </span>
              <div>
                <p className="font-display text-xl font-bold text-cream-50">Nanna Foods</p>
                <p className="font-urdu text-sm text-flame-400">{business.nameUr}</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream-200/60">
              {business.shortDescription}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cream-200/50">Opening Hours</p>
            <ul className="mt-4 space-y-2 text-sm text-cream-200/70">
              {business.hours.sample.map((entry) => (
                <li key={entry.day} className="flex justify-between gap-6 border-b border-cream-100/5 pb-2">
                  <span>{entry.day}</span>
                  <span className="text-right text-cream-200/50">{entry.time}</span>
                </li>
              ))}
            </ul>
            {!business.hours.isVerified && (
              <p className="mt-3 text-xs italic text-cream-200/40">{business.hours.note}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cream-200/50">Find Us</p>
            <p className="mt-4 text-sm leading-relaxed text-cream-200/70">
              {business.location.addressLine1}
              <br />
              {business.location.addressLine2}
            </p>

            {business.social.facebookUrl && (
              <a
                href={business.social.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-flame-400 hover:text-flame-300"
              >
                <span aria-hidden="true">📘</span> Facebook Page
              </a>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-cream-100/10 pt-6 text-center text-xs text-cream-200/40 sm:flex-row sm:justify-between sm:text-left">
          <p>
            © {year} Nanna Foods. All rights reserved.
          </p>
          <p>
            Website concept by{" "}
            <span className="font-semibold text-cream-200/60">{siteConfig.agency.name}</span>
          </p>
        </div>

        {siteConfig.isDemo && (
          <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed text-cream-200/30">
            {siteConfig.demoNotice}
          </p>
        )}
      </div>
    </footer>
  );
}
