"use client";
import { useEffect, useRef, useState } from "react";
import {
  AuroraBackground,
  BentoTile,
  CairnStack,
  CredentialBadge,
  Icon,
  MagneticButton,
  Modal,
  ProviderChain,
  SectionHead,
  SmallEyebrow,
  SplitText,
  Typewriter,
} from "@/components/ui/primitives";
import { TopNav, Footer } from "@/components/ui/shell";
import { CursorAndProgress } from "@/components/ui/CursorAndProgress";

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="page-enter">
      <CursorAndProgress />
      <TopNav />
      <Hero onDemo={() => setDemoOpen(true)} />
      <Marquee />
      <ProblemScene />
      <HowItWorks />
      <BentoEvaluation />
      <PortfolioPreview />
      <WhyGemma />
      <Pricing />
      <FAQ />
      <Footer />
      <Modal open={demoOpen} onClose={() => setDemoOpen(false)} width={840}>
        <div
          style={{
            aspectRatio: "16/9",
            borderRadius: 14,
            background: "linear-gradient(135deg, #1a1d2e, #0e1019)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AuroraBackground intensity={0.6} />
          <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
            <Icon
              name="play"
              size={56}
              style={{ color: "#fff", opacity: 0.9, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.6))" }}
            />
            <div className="serif italic" style={{ fontSize: 28, marginTop: 14 }}>
              The 90-second tour
            </div>
            <div style={{ color: "var(--text-mid)", marginTop: 6, fontSize: 14 }}>
              Goal → path → projects → credentials → portfolio
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- HERO ---------------- */
const Hero = ({ onDemo }: { onDemo: () => void }) => (
  <section
    id="hero"
    className="grain"
    style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}
  >
    <AuroraBackground />
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07 }} aria-hidden="true">
      <defs>
        <pattern id="gridp" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M64 0H0V64" fill="none" stroke="white" strokeWidth=".5" />
        </pattern>
        <radialGradient id="gridmask" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="m">
          <rect width="100%" height="100%" fill="url(#gridmask)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#gridp)" mask="url(#m)" />
    </svg>

    <div className="container" style={{ position: "relative", zIndex: 2, paddingTop: 140, paddingBottom: 100 }}>
      <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 60, alignItems: "center" }}>
        <div>
          <div className="pill pill-indigo" style={{ marginBottom: 24 }}>
            <span className="dot" style={{ background: "#a5b4fc", boxShadow: "0 0 8px #a5b4fc" }} />
            New · Multimodal evaluation now in beta
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(48px, 7.5vw, 104px)",
              lineHeight: 0.96,
              margin: 0,
              letterSpacing: "-0.035em",
            }}
          >
            <SplitText>Turn the chaos of free tutorials into a</SplitText>{" "}
            <span
              className="italic grad-text"
              style={{
                position: "relative",
                animation: "fadeUp .8s .4s cubic-bezier(.16,1,.3,1) both",
                display: "inline-block",
              }}
            >
              verified path
            </span>{" "}
            <SplitText delay={900}>to your next career.</SplitText>
          </h1>
          <p
            style={{
              marginTop: 28,
              fontSize: 20,
              color: "var(--text-mid)",
              maxWidth: 560,
              lineHeight: 1.5,
              animation: "fadeUp .8s 1.4s cubic-bezier(.16,1,.3,1) both",
            }}
          >
            Cairn uses Gemma 4 to plan, verify, and showcase your learning — in 12 weeks. No more bookmarks-as-progress.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 36, animation: "fadeUp .8s 1.6s cubic-bezier(.16,1,.3,1) both" }}>
            <MagneticButton href="/onboarding">
              Start free <Icon name="arrow-right" size={14} />
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={onDemo}>
              <Icon name="play" size={12} /> Watch 90-sec demo
            </MagneticButton>
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 36,
              color: "var(--text-mid)",
              fontSize: 13,
              animation: "fadeUp .8s 1.8s cubic-bezier(.16,1,.3,1) both",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={14} style={{ color: "#6ee7b7" }} /> No credit card
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={14} style={{ color: "#6ee7b7" }} /> Free Gemma routing
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={14} style={{ color: "#6ee7b7" }} /> Recruiter-shareable
            </span>
          </div>
        </div>
        <div className="hero-right" style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: "-10%",
              background: "radial-gradient(circle, var(--primary-glow), transparent 60%)",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />
          <CairnStack />
        </div>
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        color: "var(--text-mid)",
        fontSize: 11,
        letterSpacing: ".14em",
        animation: "fadeUp 1s 2.2s both",
      }}
    >
      <span>SCROLL</span>
      <svg width="16" height="22">
        <rect x="0.5" y="0.5" width="15" height="21" rx="7" fill="none" stroke="currentColor" opacity=".5" />
        <circle cx="8" cy="7" r="2" fill="currentColor">
          <animate attributeName="cy" values="7;15;7" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
    <style>{`
      @media (max-width: 900px) {
        .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        .hero-right { transform: scale(.85); }
      }
    `}</style>
  </section>
);

const Marquee = () => {
  const logos = ["Stanford", "MIT", "Berkeley", "CMU", "Toronto", "Princeton", "ETH", "Imperial", "UCL", "NUS", "Tsinghua", "EPFL"];
  const list = [...logos, ...logos];
  return (
    <section
      style={{
        padding: "40px 0",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        background: "var(--bg-0)",
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div style={{ fontSize: 12, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".16em", flexShrink: 0 }}>
          Trusted by learners from
        </div>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div className="marquee-track">
            {list.map((l, i) => (
              <div key={i} className="serif italic" style={{ fontSize: 28, color: "var(--text-mid)", opacity: 0.7 }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 80, background: "linear-gradient(90deg, var(--bg-0), transparent)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 80, background: "linear-gradient(270deg, var(--bg-0), transparent)" }} />
        </div>
      </div>
    </section>
  );
};

const ProblemScene = () => {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / total));
      setProgress(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const phrases = [
    { t: "You bookmark 47 tutorials.", n: 47, label: "tabs open" },
    { t: "You finish 3.", n: 3, label: "completed" },
    { t: "You can't prove any of them.", n: 0, label: "credentials" },
  ];
  const seg = 1 / phrases.length;
  return (
    <section ref={ref} style={{ height: "250vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.08), transparent 60%)" }} />
        <div className="container" style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
          <div className="pill pill-warm" style={{ marginBottom: 24 }}>
            The problem with self-directed learning
          </div>
          <div style={{ position: "relative", height: 200 }}>
            {phrases.map((p, i) => {
              const start = i * seg;
              const local = Math.max(0, Math.min(1, (progress - start) / seg));
              const opacity =
                i === phrases.length - 1
                  ? progress >= start
                    ? Math.min(1, local * 2)
                    : 0
                  : Math.min(1, Math.sin(local * Math.PI) * 1.5);
              const y = (1 - local) * 20;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity,
                    transform: `translateY(${y}px)`,
                    transition: "all .3s ease",
                  }}
                >
                  <h2
                    className="serif italic"
                    style={{ fontSize: "clamp(40px, 7vw, 96px)", lineHeight: 1, margin: 0, letterSpacing: "-.03em" }}
                  >
                    {p.t}
                  </h2>
                  <div
                    style={{
                      marginTop: 24,
                      fontFamily: "var(--mono)",
                      fontSize: 13,
                      color: "var(--text-mid)",
                      letterSpacing: ".16em",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.n} {p.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 60, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 260, height: 3, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--mint))" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-lo)", letterSpacing: ".14em", textTransform: "uppercase" }}>Until now</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ChatVis = () => {
  const examples = ["Become an AI engineer", "Land a frontend role", "Ship an iOS app", "Pivot to ML research"];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % examples.length), 2600);
    return () => clearInterval(t);
  }, [examples.length]);
  return (
    <div style={{ padding: 14, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
      <div style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--mono)" }}>&gt; goal</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-hi)", minHeight: 20 }}>
        <Typewriter key={idx} text={examples[idx]} speed={40} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        {["6 mo", "remote", "no degree"].map((t) => (
          <span key={t} className="pill" style={{ fontSize: 10 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

const GanttVis = () => (
  <div style={{ padding: 14, height: "100%", display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
    {[
      { l: "Phase 1", w: "30%", x: "0%", c: "#818CF8" },
      { l: "Phase 2", w: "30%", x: "30%", c: "#34D399" },
      { l: "Phase 3", w: "40%", x: "60%", c: "#FB923C" },
    ].map((r, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-mid)", width: 48, fontFamily: "var(--mono)" }}>{r.l}</div>
        <div style={{ flex: 1, height: 10, borderRadius: 4, background: "var(--bg-1)", position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: r.x,
              width: r.w,
              top: 0,
              bottom: 0,
              background: `linear-gradient(90deg, ${r.c}, ${r.c}88)`,
              borderRadius: 4,
              animation: `drawIn 1.2s ${i * 0.15}s cubic-bezier(.16,1,.3,1) both`,
              transformOrigin: "left",
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

const ScanVis = () => (
  <div style={{ position: "relative", height: "100%" }}>
    <div style={{ position: "absolute", inset: 14, borderRadius: 8, background: "var(--bg-1)", boxShadow: "inset 0 0 0 1px var(--border)", overflow: "hidden" }}>
      <div className="code-block" style={{ padding: 10, fontSize: 10, color: "var(--text-mid)" }}>
        <div>
          <span className="tok-kw">import</span> torch
        </div>
        <div>
          <span className="tok-kw">class</span> <span className="tok-fn">Model</span>(nn.Module):
        </div>
        <div style={{ paddingLeft: 10 }}>
          <span className="tok-kw">def</span> <span className="tok-fn">forward</span>(self, x):
        </div>
        <div style={{ paddingLeft: 20 }}>
          <span className="tok-kw">return</span> self.layers(x)
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent, #34D399, transparent)",
          boxShadow: "0 0 14px #34D399",
          animation: "scan 2.4s linear infinite",
        }}
      />
    </div>
  </div>
);

const CredVis = () => (
  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", perspective: "600px" }}>
    <div
      style={{
        width: 140,
        height: 80,
        borderRadius: 10,
        background: "linear-gradient(135deg, #1a1d2e, #0e1019)",
        boxShadow: "0 20px 40px -10px rgba(99,102,241,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)",
        animation: "flipCard 1.2s cubic-bezier(.16,1,.3,1) both, gentleFloat 4s ease-in-out infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 4,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at top right, rgba(52,211,153,0.3), transparent 60%)" }} />
      <div className="mono" style={{ fontSize: 8, color: "var(--text-mid)", letterSpacing: ".12em", position: "relative" }}>CAIRN VERIFIED</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
        <Icon name="check" size={14} stroke={2} style={{ color: "#6ee7b7" }} />
        <span className="serif italic" style={{ fontSize: 14 }}>AI Engineer</span>
      </div>
    </div>
  </div>
);

const HowItWorks = () => {
  const steps = [
    { n: 1, title: "Tell us your goal", sub: "Free-form, plain English. Gemma 4 4B parses into a structured profile.", vis: <ChatVis /> },
    { n: 2, title: "Get a 12-week path", sub: "A drawn-from-scratch roadmap with phases, milestones, and curated free resources.", vis: <GanttVis /> },
    { n: 3, title: "Ship → AI evaluates", sub: "Multimodal: 27B reviews code, 12B sees screenshots. Stage-by-stage scoring.", vis: <ScanVis /> },
    { n: 4, title: "Earn verified credentials", sub: "HMAC-signed badges on a recruiter-shareable portfolio. No more 'trust me bro.'", vis: <CredVis /> },
  ];
  return (
    <section id="how" style={{ padding: "160px 0", position: "relative" }}>
      <div className="container">
        <SectionHead eyebrow="How Cairn works" title={<>Four steps from <i>chaos</i> to <i>credential</i>.</>} />
        <div className="how-grid" style={{ marginTop: 64, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {steps.map((s) => (
            <div key={s.n} className="card" style={{ padding: 24, position: "relative", overflow: "hidden", minHeight: 360 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "var(--bg-2)",
                    boxShadow: "inset 0 0 0 1px var(--border-strong)",
                    color: "var(--text-mid)",
                  }}
                >
                  STEP {String(s.n).padStart(2, "0")}
                </div>
              </div>
              <div
                style={{
                  height: 140,
                  marginBottom: 20,
                  position: "relative",
                  borderRadius: 10,
                  background: "var(--bg-2)",
                  boxShadow: "inset 0 0 0 1px var(--border)",
                  overflow: "hidden",
                }}
              >
                {s.vis}
              </div>
              <h3 className="serif" style={{ fontSize: 24, margin: 0, letterSpacing: "-.02em" }}>{s.title}</h3>
              <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 1100px) { .how-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 600px) { .how-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
};

const FakeAppShot = () => (
  <div style={{ width: "100%", height: "100%", borderRadius: 6, background: "linear-gradient(180deg, #131520 0%, #0a0c14 100%)", overflow: "hidden", position: "relative" }}>
    <div style={{ padding: 8, display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ width: 8, height: 8, borderRadius: 999, background: "#FB923C" }} />
      <div style={{ width: 8, height: 8, borderRadius: 999, background: "#A1A1AA" }} />
      <div style={{ width: 8, height: 8, borderRadius: 999, background: "#A1A1AA" }} />
      <div className="mono" style={{ fontSize: 9, color: "var(--text-mid)", marginLeft: 8 }}>codex-studio</div>
    </div>
    <div style={{ padding: 10 }}>
      <div className="serif italic" style={{ fontSize: 14, color: "#fff" }}>What do you want to build?</div>
      <div style={{ marginTop: 6, height: 4, width: "80%", background: "rgba(255,255,255,0.1)", borderRadius: 2 }} />
      <div style={{ marginTop: 4, height: 4, width: "50%", background: "rgba(255,255,255,0.07)", borderRadius: 2 }} />
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={{ height: 40, borderRadius: 4, background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1))" }} />
        <div style={{ height: 40, borderRadius: 4, background: "linear-gradient(135deg, rgba(52,211,153,0.3), rgba(52,211,153,0.05))" }} />
      </div>
    </div>
  </div>
);

const BoundingBoxes = () => (
  <svg style={{ position: "absolute", inset: 14, pointerEvents: "none" }} width="calc(100% - 28px)" height="calc(100% - 28px)" preserveAspectRatio="none" viewBox="0 0 200 140">
    {[
      { x: 8, y: 22, w: 184, h: 14, c: "#34D399", l: "header" },
      { x: 8, y: 58, w: 140, h: 8, c: "#818CF8", l: "h1" },
      { x: 8, y: 100, w: 88, h: 28, c: "#FB923C", l: "cta cluster" },
    ].map((b, i) => (
      <g key={i}>
        <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={b.c} strokeWidth="0.8" strokeDasharray="3 2" opacity="0.9">
          <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <text x={b.x + 2} y={b.y - 1} fill={b.c} fontSize="4" fontFamily="JetBrains Mono">
          {b.l}
        </text>
      </g>
    ))}
  </svg>
);

const CountUp = ({ value, suffix }: { value: number; suffix?: string }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    let t0: number | undefined;
    const dur = 1500;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - (t0 as number)) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div className="serif" style={{ fontSize: 22 }}>
      {Number.isInteger(value) ? Math.round(n) : n.toFixed(1)}
      <span style={{ fontSize: 12, color: "var(--text-mid)" }}>{suffix}</span>
    </div>
  );
};

const BentoEvaluation = () => (
  <section id="eval" style={{ padding: "120px 0", position: "relative" }}>
    <div className="container">
      <SectionHead
        eyebrow="The hero feature"
        title={<>Multimodal evaluation, in <i>four stages</i>.</>}
        sub="We don't just run your code — we look at the screens you ship. Gemma 4 12B's vision sees what users see."
      />
      <div
        className="bento-grid"
        style={{
          marginTop: 56,
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 16,
          gridAutoFlow: "dense",
        }}
      >
        <BentoTile span={{ col: 2, row: 2 }} glow>
          <SmallEyebrow>Stage 2 + 3 · Live preview</SmallEyebrow>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, height: 380 }}>
            <div style={{ borderRadius: 10, background: "var(--bg-0)", boxShadow: "inset 0 0 0 1px var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="github" size={12} />
                <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>codex-studio / src / agent.py</span>
                <span className="pill pill-mint" style={{ marginLeft: "auto", fontSize: 10 }}>+72 −18</span>
              </div>
              <div className="code-block" style={{ padding: 12, flex: 1, overflow: "hidden" }}>
                <div><span className="tok-com"># Stream multimodal eval</span></div>
                <div><span className="tok-kw">async def</span> <span className="tok-fn">evaluate</span>(repo, shots):</div>
                <div style={{ paddingLeft: 10 }}>graph = build_graph(repo)</div>
                <div style={{ paddingLeft: 10 }}>review = <span className="tok-kw">await</span> gemma27b(graph)</div>
                <div style={{ paddingLeft: 10 }}>vision = <span className="tok-kw">await</span> gemma12b(shots)</div>
                <div style={{ paddingLeft: 10 }}><span className="tok-kw">return</span> sign(review, vision)</div>
                <div style={{ height: 8 }} />
                <div style={{ color: "#6ee7b7", fontSize: 11 }}>+ structured findings: 14</div>
                <div style={{ color: "#6ee7b7", fontSize: 11 }}>+ verified: True</div>
              </div>
            </div>
            <div style={{ borderRadius: 10, background: "var(--bg-0)", boxShadow: "inset 0 0 0 1px var(--border)", overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="image" size={12} />
                <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>app.codex.studio</span>
                <span className="pill pill-indigo" style={{ marginLeft: "auto", fontSize: 10 }}>Vision · 12B</span>
              </div>
              <div style={{ position: "relative", flex: 1, padding: 14 }}>
                <FakeAppShot />
                <BoundingBoxes />
              </div>
            </div>
          </div>
        </BentoTile>

        <BentoTile>
          <SmallEyebrow>Stage 1 · Structural</SmallEyebrow>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {([
              ["Commits", 142, "", "route"],
              ["Tests passing", 96, "%", "check"],
              ["README quality", 8.4, "/10", "badge"],
            ] as const).map(([l, v, s, ic]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--bg-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-mid)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                >
                  <Icon name={ic} size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text-mid)" }}>{l}</div>
                  <CountUp value={v} suffix={s} />
                </div>
              </div>
            ))}
          </div>
        </BentoTile>

        <BentoTile>
          <SmallEyebrow>Stage 4 · Credential</SmallEyebrow>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
            <div style={{ transform: "scale(0.6)", transformOrigin: "center" }}>
              <CredentialBadge title="AI Engineer" project="Codex Studio" score={92} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 4, wordBreak: "break-all" }}>
            sig: e3b0c4 ... 9b427
          </div>
        </BentoTile>

        <BentoTile span={{ col: 2, row: 1 }}>
          <SmallEyebrow>Provider fallback chain</SmallEyebrow>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 10 }}>
            If a provider is rate-limited or down, we fail over without losing your run state.
          </p>
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <ProviderChain providers={["Gemma 4 27B", "Gemini 2.5", "DeepSeek R3", "Local 4B"]} active={0} />
            <span style={{ fontSize: 12, color: "var(--text-mid)" }}>
              · latency p50 <span className="mono">1.4s</span> · success <span className="mono">99.7%</span>
            </span>
          </div>
        </BentoTile>
      </div>
    </div>
    <style>{`
      @media (max-width: 1000px) {
        .bento-grid { grid-template-columns: 1fr 1fr !important; }
        .bento-grid > div:first-child { grid-column: span 2 !important; }
      }
      @media (max-width: 640px) {
        .bento-grid { grid-template-columns: 1fr !important; }
        .bento-grid > div { grid-column: span 1 !important; }
      }
    `}</style>
  </section>
);

const PortfolioPreview = () => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - (r.top + r.height / 2)) / r.height) * -6,
      y: ((e.clientX - (r.left + r.width / 2)) / r.width) * 6,
    });
  };
  return (
    <section style={{ padding: "140px 0", position: "relative", overflow: "hidden" }}>
      <div className="container">
        <SectionHead
          eyebrow="Public portfolio"
          title={<>One link. <i>Real proof.</i></>}
          sub="Every credential is HMAC-signed and verifiable. Recruiters click, scan a QR, and see the underlying evaluation."
        />
        <div ref={ref} onMouseMove={onMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })} style={{ marginTop: 56, position: "relative", perspective: "1500px" }}>
          <div
            style={{
              background: "var(--bg-1)",
              borderRadius: 18,
              boxShadow: "0 80px 200px -40px rgba(0,0,0,0.7), inset 0 0 0 1px var(--border-strong)",
              overflow: "hidden",
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform .15s ease",
              maxWidth: 1080,
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "#ef4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "#fbbf24" }} />
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "#22c55e" }} />
              <div className="mono" style={{ fontSize: 12, color: "var(--text-mid)", marginLeft: 14, padding: "4px 10px", background: "var(--bg-2)", borderRadius: 6 }}>
                cairn.dev/u/mira-k
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <Icon name="lock" size={12} style={{ color: "var(--text-mid)" }} />
                <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>secure</span>
              </div>
            </div>
            <div className="preview-grid" style={{ padding: 40, display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 36 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 999, background: "linear-gradient(135deg, #FB923C, #8B5CF6)", boxShadow: "0 0 0 3px rgba(99,102,241,0.35)" }} />
                  <div>
                    <div className="serif italic" style={{ fontSize: 32, lineHeight: 1 }}>Mira K.</div>
                    <div style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 4 }}>AI Engineer · Bangalore</div>
                  </div>
                </div>
                <div style={{ marginTop: 24, padding: 14, borderRadius: 12, background: "var(--bg-2)", boxShadow: "inset 0 0 0 1px var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em" }}>Cairn-verified path</div>
                  <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>AI Engineer · Week 12 of 12</div>
                  <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "var(--bg-0)", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, var(--primary), var(--mint))" }} />
                  </div>
                </div>
                <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
                  <MagneticButton variant="ghost" href="/example">
                    See live <Icon name="arrow-up-right" size={12} />
                  </MagneticButton>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { t: "Codex Studio", s: 92, tags: ["Vision", "RAG"] },
                  { t: "NoteShelf", s: 88, tags: ["Next.js", "tRPC"] },
                  { t: "Echo Buddy", s: 81, tags: ["Whisper", "Eleven"] },
                  { t: "PaperCanvas", s: 95, tags: ["Three.js", "GLSL"] },
                ].map((p) => (
                  <div key={p.t} className="card" style={{ padding: 14 }}>
                    <div
                      style={{
                        height: 60,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${p.s > 90 ? "rgba(52,211,153,0.3)" : "rgba(99,102,241,0.3)"}, rgba(99,102,241,0.05))`,
                        marginBottom: 10,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div className="serif" style={{ fontSize: 16 }}>{p.t}</div>
                      <div className="mono" style={{ fontSize: 11, color: p.s >= 90 ? "#6ee7b7" : "#a5b4fc" }}>
                        {p.s}/100
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                      {p.tags.map((t) => (
                        <span key={t} className="pill" style={{ fontSize: 10 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 800px) { .preview-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
};

const WhyGemma = () => {
  const cards = [
    { sz: "4B", role: "Goal parsing", latency: "120ms", desc: "Tiny, fast, runs everywhere. Converts your messy goal into a structured profile.", tone: "#a5b4fc" },
    { sz: "12B", role: "Visual review", latency: "480ms", desc: "Vision-tuned. Scans your screenshots and reads UI like a senior designer.", tone: "#6ee7b7" },
    { sz: "27B", role: "Code review", latency: "1.4s", desc: "Deep reasoning. Reads your repo as a structured graph, not just files.", tone: "#fdba74" },
  ];
  return (
    <section style={{ padding: "120px 0" }}>
      <div className="container">
        <SectionHead
          eyebrow="Intentional model selection"
          title={<>Why <i>Gemma 4</i>, three sizes deep.</>}
          sub="Different problems want different brains. We route each task to the smallest model that handles it well."
        />
        <div className="why-grid" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          {cards.map((c) => (
            <div key={c.sz} className="card" style={{ padding: 28, position: "relative", overflow: "hidden" }} data-magnet>
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 200,
                  height: 200,
                  borderRadius: 999,
                  background: `radial-gradient(circle, ${c.tone}33, transparent 60%)`,
                }}
              />
              <SmallEyebrow>Gemma 4</SmallEyebrow>
              <div className="serif" style={{ fontSize: 72, lineHeight: 0.9, marginTop: 6, color: c.tone }}>{c.sz}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 6 }}>latency p50 · {c.latency}</div>
              <div style={{ marginTop: 18, fontSize: 13, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em" }}>{c.role}</div>
              <p style={{ marginTop: 6, color: "var(--text-hi)", fontSize: 15, lineHeight: 1.55 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .why-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
};

const Pricing = () => {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      cadence: "forever",
      desc: "Everything to ship one verified credential.",
      cta: "Start free",
      feats: ["1 active path", "3 project evaluations / mo", "Public portfolio", "Gemma 4 routing", "Basic support"],
      featured: false,
    },
    {
      name: "Pro",
      price: "$19",
      cadence: "/ month",
      desc: "For serious career switchers.",
      cta: "Go Pro",
      feats: ["Unlimited paths", "Unlimited evaluations", "Re-eval & coach feedback", "Recruiter direct outreach", "Custom domain on portfolio", "Priority queue"],
      featured: true,
    },
    {
      name: "Teams",
      price: "$9",
      cadence: "/ seat / mo",
      desc: "For bootcamps & talent teams.",
      cta: "Book a call",
      feats: ["Cohort dashboard", "Org branding", "SSO + SCIM", "Bulk verification API", "Recruiter analytics", "Dedicated CSM"],
      featured: false,
    },
  ];
  return (
    <section id="pricing" style={{ padding: "120px 0" }}>
      <div className="container">
        <SectionHead eyebrow="Pricing" title={<>Free to start. <i>Proof</i> isn't a paywall.</>} />
        <div className="price-grid" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {tiers.map((t) => {
            const inner = (
              <div style={{ padding: 32, height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="serif italic" style={{ fontSize: 26 }}>{t.name}</div>
                  {t.featured && <span className="pill pill-indigo">Most popular</span>}
                </div>
                <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 8, minHeight: 38 }}>{t.desc}</p>
                <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="serif" style={{ fontSize: 56, lineHeight: 1 }}>{t.price}</span>
                  <span style={{ color: "var(--text-mid)", fontSize: 14 }}>{t.cadence}</span>
                </div>
                <div style={{ marginTop: 24, flex: 1 }}>
                  {t.feats.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", fontSize: 14, color: "var(--text-hi)" }}>
                      <Icon name="check" size={14} style={{ color: t.featured ? "#a5b4fc" : "#6ee7b7", marginTop: 3, flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24 }}>
                  <MagneticButton variant={t.featured ? "primary" : "ghost"} href="/onboarding">
                    {t.cta} <Icon name="arrow-right" size={14} />
                  </MagneticButton>
                </div>
              </div>
            );
            return t.featured ? (
              <div key={t.name} className="aurora-border" style={{ borderRadius: 20 }}>
                <div className="card" style={{ background: "var(--bg-1)", borderRadius: 19, boxShadow: "none" }}>
                  {inner}
                </div>
              </div>
            ) : (
              <div key={t.name} className="card" style={{ borderRadius: 20 }}>{inner}</div>
            );
          })}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .price-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    { q: "How is this different from just a course platform?", a: "Cairn never sells you content. We curate the best free resources, pace them, and — most importantly — verify what you shipped. The credential lives outside Cairn: it's an HMAC-signed JSON anyone can check." },
    { q: "What does 'multimodal evaluation' actually do?", a: "For each project, we run four stages: structural (commit graph, tests, README), code review (Gemma 4 27B reads the AST), visual review (Gemma 4 12B looks at screenshots of your running app), and synthesis (signed credential if score ≥ 0.65)." },
    { q: "What happens if Gemma 4 is down?", a: "Every task has a fallback chain. The default is Gemma 4 27B → Gemini 2.5 → DeepSeek R3 → Local 4B. You can customise this per-task in admin." },
    { q: "Can recruiters trust the credential?", a: "Yes. The badge contains a signed JSON payload. Recruiters can verify it against our public key or run their own verifier — no Cairn account required." },
    { q: "Will it generate a path for anything?", a: "It works best for technical paths: software engineering, ML, design engineering, devrel. For very niche or non-tech careers we ship a 'best-effort' path with a warning." },
    { q: "Is my code stored?", a: "No. We pull the repo at evaluation time, build a structural representation, and discard the source. The evaluation report is yours." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: "120px 0", borderTop: "1px solid var(--border)" }}>
      <div className="container faq-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 80 }}>
        <div>
          <SmallEyebrow>FAQ</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 56, margin: "12px 0 0", lineHeight: 0.95, letterSpacing: "-.03em" }}>
            The <i>honest</i> answers.
          </h2>
          <p style={{ color: "var(--text-mid)", marginTop: 18, fontSize: 15, lineHeight: 1.6 }}>
            Still curious? Email <a href="#" style={{ color: "#a5b4fc" }}>hi@cairn.dev</a> — we read everything.
          </p>
        </div>
        <div>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "20px 0" }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 0,
                  color: "var(--text-hi)",
                  textAlign: "left",
                }}
              >
                <span className="serif" style={{ fontSize: 22 }}>{f.q}</span>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-2)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                    transform: open === i ? "rotate(45deg)" : "rotate(0)",
                    transition: "transform .35s cubic-bezier(.16,1,.3,1)",
                  }}
                >
                  <Icon name="plus" size={14} />
                </span>
              </button>
              <div style={{ maxHeight: open === i ? 200 : 0, overflow: "hidden", transition: "max-height .35s cubic-bezier(.16,1,.3,1)" }}>
                <p style={{ color: "var(--text-mid)", fontSize: 15, lineHeight: 1.6, marginTop: 14, marginBottom: 0, maxWidth: 640 }}>{f.a}</p>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .faq-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }`}</style>
    </section>
  );
};
