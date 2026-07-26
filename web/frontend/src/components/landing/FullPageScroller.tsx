"use client";

import { useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { motion } from "framer-motion";

export function FullPageScroller({
  children,
  sectionIds,
}: {
  children: ReactNode[];
  sectionIds?: string[];
}) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isFullPage, setIsFullPage] = useState(false);
  const totalSections = children.length;
  const isScrolling = useRef(false);
  const lastWheelAt = useRef(0);
  const isInitialized = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px) and (min-height: 800px) and (pointer: fine)");
    const updateMode = () => setIsFullPage(media.matches);
    updateMode();
    media.addEventListener("change", updateMode);
    return () => media.removeEventListener("change", updateMode);
  }, []);

  useEffect(() => {
    const initialSection = sectionIds?.indexOf(window.location.hash.slice(1)) ?? -1;
    queueMicrotask(() => {
      isInitialized.current = true;
      if (initialSection >= 0) setCurrentSection(initialSection);
    });
  }, [sectionIds]);

  useEffect(() => {
    if (!isInitialized.current || !sectionIds?.[currentSection]) return;

    const hash = `#${sectionIds[currentSection]}`;
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new CustomEvent("landing:section-change", {
      detail: { sectionId: sectionIds[currentSection] },
    }));
  }, [currentSection, sectionIds]);

  useEffect(() => {
    const navigateToSection = (sectionId: string) => {
      const sectionIndex = sectionIds?.indexOf(sectionId) ?? -1;
      if (sectionIndex < 0) return;
      setCurrentSection(sectionIndex);
      if (!isFullPage) document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    };

    const handleNavigate = (event: Event) => {
      navigateToSection((event as CustomEvent<{ sectionId: string }>).detail.sectionId);
    };
    const handleHistoryChange = () => navigateToSection(window.location.hash.slice(1));

    window.addEventListener("landing:navigate", handleNavigate);
    window.addEventListener("hashchange", handleHistoryChange);
    window.addEventListener("popstate", handleHistoryChange);
    return () => {
      window.removeEventListener("landing:navigate", handleNavigate);
      window.removeEventListener("hashchange", handleHistoryChange);
      window.removeEventListener("popstate", handleHistoryChange);
    };
  }, [isFullPage, sectionIds]);

  useEffect(() => {
    if (isFullPage || !sectionIds) return;
    const observer = new IntersectionObserver(
      () => {
        const viewportCenter = window.innerHeight / 2;
        const index = sectionIds.findIndex((id) => {
          const bounds = document.getElementById(id)?.getBoundingClientRect();
          return bounds && bounds.top <= viewportCenter && bounds.bottom >= viewportCenter;
        });
        if (index >= 0) setCurrentSection(index);
      },
      { rootMargin: "-49% 0px -49% 0px", threshold: 0 },
    );
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [isFullPage, sectionIds]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const now = performance.now();
      if (Math.abs(e.deltaY) < 8 || now - lastWheelAt.current < 180) return;
      lastWheelAt.current = now;
      setCurrentSection((prev) => Math.min(totalSections - 1, Math.max(0, prev + Math.sign(e.deltaY))));
    },
    [totalSections]
  );

  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isScrolling.current) return;
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchStartY.current - touchEndY;

      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0 && currentSection < totalSections - 1) {
          isScrolling.current = true;
          setCurrentSection((prev) => prev + 1);
        } else if (deltaY < 0 && currentSection > 0) {
          isScrolling.current = true;
          setCurrentSection((prev) => prev - 1);
        }

        setTimeout(() => {
          isScrolling.current = false;
        }, 1000);
      }
    },
    [currentSection, totalSections]
  );

  useEffect(() => {
    if (!isFullPage) return;
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    const container = document.getElementById("fullpage-container");
    if (!container) return;

    container.addEventListener("wheel", preventDefault, { passive: false });
    container.addEventListener("touchmove", preventDefault, { passive: false });

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener("wheel", preventDefault);
      container.removeEventListener("touchmove", preventDefault);

      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, isFullPage]);

  return (
    <div id="fullpage-container" className={`relative w-full bg-transparent ${isFullPage ? "h-full overflow-hidden" : "overflow-visible"}`}>
      <motion.div
        className={isFullPage ? "h-full w-full" : "w-full"}
        animate={{ y: isFullPage ? `-${currentSection * 100}%` : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {children.map((child, index) => (
          <div
            id={sectionIds?.[index]}
            key={index}
            className={`${isFullPage ? "h-full" : "min-h-0 py-10 md:py-12"} relative flex w-full shrink-0 items-center justify-center`}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
