"use client";
import { useEffect } from "react";

export function CursorAndProgress() {
  useEffect(() => {
    const dot = document.getElementById("__dot");
    const ring = document.getElementById("__ring");
    const progress = document.getElementById("__progress");
    if (!dot || !ring || !progress) return;

    let rx = 0,
      ry = 0,
      dx = 0,
      dy = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
      rx = e.clientX;
      ry = e.clientY;
    };
    const tick = () => {
      dx += (rx - dx) * 0.18;
      dy += (ry - dy) * 0.18;
      ring.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t && t.closest && t.closest("a,button,[data-magnet]")) {
        ring.style.width = "56px";
        ring.style.height = "56px";
        ring.style.opacity = "0.9";
      } else {
        ring.style.width = "32px";
        ring.style.height = "32px";
        ring.style.opacity = "0.5";
      }
    };

    const onScroll = () => {
      const sc = document.scrollingElement;
      if (!sc) return;
      const max = sc.scrollHeight - sc.clientHeight;
      progress.style.width = max > 0 ? (sc.scrollTop / max) * 100 + "%" : "0%";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <div className="topbar-progress">
        <div id="__progress" />
      </div>
      <div className="cursor-ring" id="__ring" />
      <div className="cursor-dot" id="__dot" />
    </>
  );
}
