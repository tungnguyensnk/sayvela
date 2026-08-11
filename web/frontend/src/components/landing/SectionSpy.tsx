"use client";

import { useEffect } from "react";

/**
 * Tells the header which landing section is in view so the nav can mark it,
 * without touching the URL on every scroll tick.
 */
export function SectionSpy({ sectionIds }: { sectionIds: string[] }) {
  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sections.length === 0) return;

    let current = "";

    // whichever section owns the middle of the viewport wins; past the last
    // section (CTA, footer) the final section stays marked rather than clearing
    const update = () => {
      const centre = window.innerHeight / 2;
      let next = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= centre) next = section.id;
      }
      if (next === current) return;
      current = next;
      window.dispatchEvent(
        new CustomEvent("landing:section-change", { detail: { sectionId: next } }),
      );
    };

    // the observer only acts as a trigger — the decision above stays the same
    const observer = new IntersectionObserver(update, {
      rootMargin: "-49% 0px -49% 0px",
      threshold: 0,
    });
    sections.forEach((section) => observer.observe(section));

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionIds]);

  return null;
}
