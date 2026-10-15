import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Briefcase, ExternalLink, GitBranch, Globe, MapPin, Sparkles, Star } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/primitives";
import { APP_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { getPublicPortfolio } from "@/lib/queries/portfolio";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicPortfolio(username);
  if (!profile) return { title: "Profile not found" };
  return { title: `${profile.owner.name} — ${profile.owner.profession ?? "Portfolio"}`, description: profile.owner.headline ?? profile.owner.bio ?? undefined };
}

export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;
  const profile = await getPublicPortfolio(username);
  if (!profile) notFound();
  const { owner: user, items, stats } = profile;
  const featured = items.filter((item) => item.featured);
  const rest = items.filter((item) => !item.featured);

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Sparkles className="size-3.5" />
          </span>
          {APP_NAME}
        </Link>
        <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">
          Create your own profile <ArrowUpRight className="inline size-3.5" />
        </Link>
      </header>

      <main className="relative mx-auto max-w-5xl px-6 pb-24">
        <section className="flex flex-col items-start gap-6 pt-8 sm:flex-row sm:items-center">
          <Avatar name={user.name} src={user.avatarUrl} size="xl" className="size-24 text-2xl ring-4 ring-background shadow-float" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{user.name}</h1>
            <p className="mt-1 text-lg text-primary">{user.profession}</p>
            {user.headline ? <p className="mt-2 max-w-2xl text-muted-foreground">{user.headline}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {user.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {user.location}
                </span>
              ) : null}
              {user.website ? (
                <a href={user.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  <Globe className="size-3.5" /> {user.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Briefcase className="size-3.5" /> {stats.completedProjects} project{stats.completedProjects === 1 ? "" : "s"} delivered
              </span>
            </div>
          </div>
        </section>

        {user.bio ? <p className="mt-8 max-w-3xl whitespace-pre-line leading-relaxed text-muted-foreground">{user.bio}</p> : null}

        {user.skills.length ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.skills.map((skill) => (
                <Badge key={skill} tone="outline" className="px-3 py-1 text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Selected work</h2>
              <p className="text-sm text-muted-foreground">{items.length} project{items.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No public work yet — check back soon.</p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {[...featured, ...rest].map((item, index) => (
                <article key={item.id} className={index === 0 && featured.length ? "sm:col-span-2" : undefined}>
                  <div className="card-hover overflow-hidden rounded-3xl border bg-card shadow-card">
                    <div className={index === 0 && featured.length ? "relative aspect-[21/9]" : "relative aspect-[16/10]"} style={{ background: item.gradient }}>
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl font-bold text-white/30">{item.title.slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      {item.featured ? (
                        <Badge className="absolute left-4 top-4 gap-1 bg-amber-400 text-amber-950 hover:bg-amber-400">
                          <Star className="size-3 fill-current" /> Featured
                        </Badge>
                      ) : null}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-primary">{item.category}</p>
                          <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {item.liveUrl ? (
                            <a href={item.liveUrl} target="_blank" rel="noreferrer" className="rounded-lg border p-2 text-muted-foreground hover:text-foreground" aria-label="Live site">
                              <ExternalLink className="size-4" />
                            </a>
                          ) : null}
                          {item.repoUrl ? (
                            <a href={item.repoUrl} target="_blank" rel="noreferrer" className="rounded-lg border p-2 text-muted-foreground hover:text-foreground" aria-label="Repository">
                              <GitBranch className="size-4" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                      {item.description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p> : null}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => (
                            <Badge key={tag} tone="muted">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {item.completedOn ? <span className="text-xs text-muted-foreground">{formatDate(item.completedOn, "MMM yyyy")}</span> : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-20 flex flex-col items-center gap-2 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            Want to work with {user.name.split(" ")[0]}?{user.website ? (
              <>
                {" "}
                Visit{" "}
                <a href={user.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
                .
              </>
            ) : null}
          </p>
          <p>
            Built with{" "}
            <Link href="/" className="font-medium text-foreground hover:underline">
              {APP_NAME}
            </Link>{" "}
            — the workspace for independent professionals.
          </p>
        </footer>
      </main>
    </div>
  );
}
