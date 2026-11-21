import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { text, type C } from "@/lib/cms/content";

/** Editorial "continue reading" band that links a page onward. */
export function NextPage({ content }: { content: C }) {
  const href = text(content, "href");
  const title = text(content, "title");
  if (!href || !title) return null;
  return (
    <section aria-label="Next page" className="border-t border-rule bg-paper">
      <Link href={href} className="group shell flex flex-col gap-6 py-[clamp(3.5rem,7vw,6rem)] md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker text-stone">{text(content, "kicker", "Next")}</p>
          <p className="display mt-4 text-[clamp(2.6rem,6vw,6rem)] text-charcoal transition-colors duration-500 group-hover:text-forest">{title}</p>
          {text(content, "line") && <p className="mt-3 max-w-[50ch] text-lg text-charcoal-2">{text(content, "line")}</p>}
        </div>
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-charcoal text-amber transition-all duration-500 group-hover:bg-amber group-hover:text-charcoal md:h-28 md:w-28">
          <ArrowRight className="h-7 w-7 transition-transform duration-500 group-hover:translate-x-1" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
