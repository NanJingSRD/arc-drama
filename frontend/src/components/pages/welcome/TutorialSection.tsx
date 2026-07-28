import { useState } from "react";
import type { TutorialItem } from "./welcome-data";
import { WelcomeLazyVideo } from "./WelcomeLazyVideo";
import { WELCOME_CARD, WELCOME_SECTION_WIDE } from "./welcome-layout";

interface TutorialSectionProps {
  tutorials: TutorialItem[];
}

function TutorialCard({ item }: { item: TutorialItem }) {
  const [hovering, setHovering] = useState(false);

  return (
    <article
      className={`group ${WELCOME_CARD}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-video overflow-hidden">
        {item.video ? (
          <WelcomeLazyVideo src={item.video} playing={hovering} observe />
        ) : (
          <div className="h-full w-full bg-[#12151c]" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
        <h3 className="absolute bottom-3 left-3 right-12 line-clamp-2 text-left text-[13px] font-semibold leading-snug text-white">
          {item.title}
        </h3>
        <span className="absolute bottom-3 right-3 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white/80">
          {item.duration}
        </span>
      </div>
      <p className="px-4 py-3 text-xs leading-relaxed text-white/45">{item.description}</p>
    </article>
  );
}

export function TutorialSection({ tutorials }: TutorialSectionProps) {
  return (
    <section id="tutorials" className={`${WELCOME_SECTION_WIDE} py-10 sm:py-12 scroll-mt-20`}>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-lg font-bold text-white sm:text-xl">使用教程</h2>
        <span className="cursor-pointer text-sm text-cyan-400/80 transition hover:text-cyan-300 hover:underline">
          查看全部 &gt;
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tutorials.map((t) => (
          <TutorialCard key={t.id} item={t} />
        ))}
      </div>
    </section>
  );
}
