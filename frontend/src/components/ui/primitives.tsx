"use client";
import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/* --------------------------- Icons (line) --------------------------- */
type IconProps = {
  name: string;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
};

export const Icon = ({ name, size = 18, stroke = 1.5, style, className }: IconProps) => {
  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
    className,
  };
  switch (name) {
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "arrow-up-right":
      return (
        <svg {...common}>
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M5 12.5 10 17 19 7" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2 5.6 18.4" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 1-2 3-2 4 0-2-1-5-4-8-1 4-5 6-5 11 0 4 3 7 7 7Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 16V11a6 6 0 0 0-12 0v5l-2 2h16l-2-2ZM10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "google":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
          <path
            d="M21.6 12.227c0-.708-.064-1.39-.182-2.045H12v3.868h5.382a4.605 4.605 0 0 1-1.996 3.018v2.51h3.232c1.891-1.741 2.982-4.305 2.982-7.351Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H2.064v2.59A9.997 9.997 0 0 0 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.404 13.9a6.005 6.005 0 0 1 0-3.8V7.51H2.064a9.997 9.997 0 0 0 0 8.98l4.34-2.59Z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2A9.997 9.997 0 0 0 2.064 7.51l4.34 2.59C7.19 7.737 9.395 5.977 12 5.977Z"
            fill="#EA4335"
          />
        </svg>
      );
    case "bell-off":
      return (
        <svg {...common}>
          <path d="M9.5 4.5A6 6 0 0 1 18 10v4l1.5 2H14M6 8v2l-2 4h9M2 2l20 20M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5c0-1-.1-1.4-.6-2 3-.4 5.6-1.5 5.6-6.4 0-1.3-.5-2.5-1.3-3.4.1-.4.5-1.8-.1-3.7 0 0-1.1-.4-3.6 1.3a12 12 0 0 0-6 0C6.5 2 5.4 2.5 5.4 2.5c-.6 1.9-.2 3.3-.1 3.7C4.5 7 4 8.2 4 9.5c0 4.9 2.6 6 5.6 6.4-.4.5-.7 1.1-.6 2V22" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11 12 3l9 8M5 10v10h14V10" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6" cy="19" r="2" />
          <circle cx="18" cy="5" r="2" />
          <path d="M6 17v-4a4 4 0 0 1 4-4h4a4 4 0 0 0 4-4" />
        </svg>
      );
    case "folder":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12c0 .4 0 .8-.1 1.2l2 1.6-2 3.4-2.4-.9c-.6.4-1.3.8-2 1l-.4 2.6h-4l-.4-2.6c-.7-.2-1.4-.6-2-1l-2.4.9-2-3.4 2-1.6c-.1-.4-.1-.8-.1-1.2s0-.8.1-1.2l-2-1.6 2-3.4 2.4.9c.6-.4 1.3-.8 2-1L10 3h4l.4 2.6c.7.2 1.4.6 2 1l2.4-.9 2 3.4-2 1.6c.1.4.1.8.1 1.2Z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "cube":
      return (
        <svg {...common}>
          <path d="m21 8-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" />
        </svg>
      );
    case "badge":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "minus":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 16-5-5L5 21" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common}>
          <path d="M4 4 20 20M20 4 4 20" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 13v4" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      );
    case "cmd":
      return (
        <svg {...common}>
          <path d="M6 8V6a2 2 0 1 1 2 2h8V6a2 2 0 1 1 2 2v8a2 2 0 1 1-2-2H8v2a2 2 0 1 1-2-2v-2a2 2 0 1 1 0-4" />
        </svg>
      );
    case "dot":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
          <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path d="m22 2-11 11M22 2l-7 20-4-9-9-4 20-7Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

/* ------------------------ Cairn Logo Mark ------------------------ */
export const CairnMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="cairn-grad-1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818CF8" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
    </defs>
    <ellipse cx="16" cy="24" rx="11" ry="3" fill="url(#cairn-grad-1)" opacity=".9" />
    <ellipse cx="16" cy="17" rx="8" ry="2.6" fill="url(#cairn-grad-1)" opacity=".85" />
    <ellipse cx="16" cy="11" rx="5.5" ry="2.2" fill="url(#cairn-grad-1)" opacity=".8" />
    <ellipse cx="16" cy="6" rx="3" ry="1.6" fill="url(#cairn-grad-1)" />
  </svg>
);

/* ------------------------ Magnetic Button ------------------------ */
type MagneticProps = {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  className?: string;
  style?: CSSProperties;
  type?: "button" | "submit";
  disabled?: boolean;
};

export const MagneticButton = ({
  children,
  variant = "primary",
  onClick,
  href,
  className = "",
  style,
  type,
  disabled,
}: MagneticProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    (el as HTMLElement).style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
  };
  const onLeave = () => {
    if (ref.current) (ref.current as HTMLElement).style.transform = "";
  };
  const cls = `btn-magnetic ${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`;
  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={cls}
        style={style}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        data-magnet
      >
        {variant === "primary" && <span className="sheen" />}
        {children}
      </a>
    );
  }
  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type ?? "button"}
      disabled={disabled}
      className={cls}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      data-magnet
    >
      {variant === "primary" && <span className="sheen" />}
      {children}
    </button>
  );
};

/* ------------------------ Aurora Background ------------------------ */
const Orb = ({
  x,
  y,
  size,
  color,
  dur = "14s",
  delay = "0s",
  anim = "orbDrift1",
}: {
  x: string;
  y: string;
  size: number;
  color: string;
  dur?: string;
  delay?: string;
  anim?: string;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: "50%",
      transform: "translate(-50%,-50%)",
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: "blur(40px)",
      animation: `${anim} ${dur} ease-in-out infinite`,
      animationDelay: delay,
    }}
  />
);

export const AuroraBackground = ({ intensity = 1 }: { intensity?: number }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        inset: "-30%",
        background:
          "conic-gradient(from 220deg at 50% 50%, #6366F1, #34D399, #FB923C, #8B5CF6, #6366F1)",
        filter: `blur(${80 * intensity}px)`,
        opacity: 0.25 * intensity,
        animation: "auroraDrift 30s ease-in-out infinite",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 0%, transparent 0%, var(--bg-0) 70%)",
      }}
    />
    <Orb x="10%" y="20%" size={520} color="rgba(99,102,241,0.35)" dur="14s" />
    <Orb x="78%" y="55%" size={420} color="rgba(52,211,153,0.22)" dur="18s" delay="-3s" anim="orbDrift2" />
    <Orb x="50%" y="80%" size={380} color="rgba(251,146,60,0.20)" dur="20s" delay="-8s" anim="orbDrift3" />
  </div>
);

/* ------------------------ SplitText reveal ------------------------ */
const extractText = (node: ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyNode = node as any;
  if (anyNode.props && anyNode.props.children !== undefined) return extractText(anyNode.props.children);
  return "";
};

export const SplitText = ({
  children,
  delay = 0,
  stagger = 30,
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  stagger?: number;
  className?: string;
  style?: CSSProperties;
}) => {
  const text = extractText(children);
  const words = text.split(" ");
  return (
    <span className={className} style={style}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", whiteSpace: "pre" }}>
          {[...word].map((ch, ci) => (
            <span
              key={ci}
              style={{
                display: "inline-block",
                animation: `fadeUp .6s cubic-bezier(.16,1,.3,1) ${delay + wi * 60 + ci * stagger}ms both`,
              }}
            >
              {ch}
            </span>
          ))}
          {wi < words.length - 1 && (
            <span style={{ display: "inline-block", width: "0.32em" }}>{" "}</span>
          )}
        </span>
      ))}
    </span>
  );
};

/* ------------------------ Glassy Cairn 3D-ish ------------------------ */
export const CairnStack = () => {
  const [rot, setRot] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const loop = (t: number) => {
      setRot(((t - t0) / 60) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - (r.left + r.width / 2)) / r.width) * 30;
    const y = ((e.clientY - (r.top + r.height / 2)) / r.height) * 30;
    setTilt({ x: -y, y: x });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  const stones = [
    { w: 200, h: 50, top: 300, z: 60, c1: "#5C5F8A", c2: "#1a1c25" },
    { w: 160, h: 42, top: 248, z: 70, c1: "#7378b3", c2: "#23263a" },
    { w: 130, h: 36, top: 202, z: 80, c1: "#9aa0e8", c2: "#2e3252" },
    { w: 108, h: 32, top: 160, z: 90, c1: "#b8bcf3", c2: "#363a64" },
    { w: 84, h: 26, top: 124, z: 100, c1: "#c8eedd", c2: "#274b3e" },
    { w: 60, h: 20, top: 94, z: 110, c1: "#ffdcb8", c2: "#5c3a1d" },
    { w: 36, h: 14, top: 72, z: 120, c1: "#ffffff", c2: "#7c8aff" },
  ];

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ width: 360, height: 420, perspective: "1200px" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + rot * 0.3}deg)`,
          transition: "transform .2s ease",
        }}
      >
        {stones.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% - ${s.w / 2}px)`,
              top: s.top,
              width: s.w,
              height: s.h,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${s.c1}, ${s.c2})`,
              boxShadow: `0 ${s.h * 0.3}px ${s.h * 1.2}px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.5)`,
              transform: `translateZ(${s.z - 60}px)`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 340,
            width: 280,
            height: 30,
            transform: "translate(-50%,0) rotateX(70deg)",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.5), transparent 70%)",
            filter: "blur(18px)",
          }}
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={"p" + i}
            style={{
              position: "absolute",
              left: `${20 + (i * 5.7) % 70}%`,
              top: `${10 + (i * 7.1) % 80}%`,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#34D399" : i % 3 === 1 ? "#FB923C" : "#a5b4fc",
              opacity: 0.7,
              transform: `translateZ(${(i % 6) * 30}px)`,
              boxShadow: "0 0 8px currentColor",
              animation: `orbDrift${(i % 3) + 1} ${6 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ------------------------ Progress Ring ------------------------ */
export const ProgressRing = ({
  value = 64,
  size = 160,
  stroke = 10,
  label,
  sublabel,
}: {
  value?: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) => {
  const R = (size - stroke) / 2;
  const C = 2 * Math.PI * R;
  const off = C - (value / 100) * C;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf: number;
    let t0: number | undefined;
    const dur = 1200;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - (t0 as number)) / dur);
      setShown(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const gradId = `pg-${size}-${Math.round(value * 1000)}`;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={R} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div className="serif" style={{ fontSize: size * 0.34, lineHeight: 1, color: "var(--text-hi)" }}>
          {shown}
          <span style={{ fontSize: size * 0.16, color: "var(--text-mid)" }}>%</span>
        </div>
        {label && (
          <div style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 6, textTransform: "uppercase", letterSpacing: ".12em" }}>
            {label}
          </div>
        )}
        {sublabel && (
          <div style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 4 }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
};

/* ------------------------ Provider chain pill ------------------------ */
export const ProviderChain = ({
  providers = ["Gemma 4 27B", "Gemini", "DeepSeek"],
  active = 0,
}: {
  providers?: string[];
  active?: number;
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 6px",
      borderRadius: 999,
      background: "var(--bg-2)",
      boxShadow: "inset 0 0 0 1px var(--border-strong)",
    }}
  >
    {providers.map((p, i) => (
      <React.Fragment key={p + i}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontFamily: "var(--mono)",
            background:
              i === active ? "linear-gradient(180deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1))" : "transparent",
            color: i === active ? "#c7d2fe" : "var(--text-mid)",
            boxShadow: i === active ? "inset 0 0 0 1px rgba(99,102,241,0.45)" : "none",
          }}
        >
          {i === active && (
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "#6ee7b7",
                boxShadow: "0 0 8px #34D399",
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
          )}
          {p}
        </span>
        {i < providers.length - 1 && <Icon name="chevron" size={10} style={{ color: "var(--text-lo)" }} />}
      </React.Fragment>
    ))}
  </div>
);

/* ------------------------ Credential Badge ------------------------ */
export const CredentialBadge = ({
  title = "Multimodal AI Engineer",
  score = 92,
  project = "Codex Studio",
  date = "Apr 2026",
  tilt = true,
}: {
  title?: string;
  score?: number;
  project?: string;
  date?: string;
  tilt?: boolean;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setT({
      x: ((e.clientY - (r.top + r.height / 2)) / r.height) * -16,
      y: ((e.clientX - (r.left + r.width / 2)) / r.width) * 16,
    });
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setT({ x: 0, y: 0 })}
      style={{
        width: 320,
        height: 200,
        borderRadius: 18,
        position: "relative",
        background: "linear-gradient(135deg, #1a1d2e 0%, #0e1019 100%)",
        transform: `perspective(900px) rotateX(${t.x}deg) rotateY(${t.y}deg)`,
        transition: "transform .15s ease",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at top right, rgba(99,102,241,0.35), transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at bottom left, rgba(52,211,153,0.18), transparent 60%)" }} />
      <div style={{ position: "absolute", top: 18, left: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <CairnMark size={18} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".18em", color: "var(--text-mid)" }}>CAIRN VERIFIED</span>
      </div>
      <div style={{ position: "absolute", top: 18, right: 20, fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-mid)" }}>
        #0x{Math.floor(score * 1234).toString(16).slice(0, 6).toUpperCase()}
      </div>
      <div style={{ position: "absolute", left: 20, bottom: 60 }}>
        <div className="serif italic" style={{ fontSize: 24, color: "#fff", lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 6 }}>
          {project} · {date}
        </div>
      </div>
      <div style={{ position: "absolute", right: 20, bottom: 18, textAlign: "right" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--text-lo)", letterSpacing: ".1em" }}>SCORE</div>
        <div className="serif" style={{ fontSize: 30, color: "#6ee7b7", lineHeight: 1 }}>
          {score}
          <span style={{ fontSize: 14, color: "var(--text-mid)" }}>/100</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 18,
          width: 34,
          height: 34,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(52,211,153,0.4), rgba(52,211,153,0.05))",
          boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" size={16} stroke={2} style={{ color: "#6ee7b7" }} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(${100 + t.y * 2}deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)`,
        }}
      />
    </div>
  );
};

/* ------------------------ Bento Tile ------------------------ */
export const BentoTile = ({
  children,
  span = { col: 1, row: 1 },
  glow = false,
  className = "",
  style,
}: {
  children: ReactNode;
  span?: { col?: number; row?: number };
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}) => (
  <div
    className={`card ${className}`}
    style={{
      gridColumn: `span ${span.col ?? 1}`,
      gridRow: `span ${span.row ?? 1}`,
      padding: 24,
      overflow: "hidden",
      position: "relative",
      ...(glow ? { boxShadow: "inset 0 0 0 1px var(--border), 0 0 60px -20px var(--primary-glow)" } : {}),
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------ KPI Chip with count ------------------------ */
export const KPIChip = ({
  label,
  value,
  suffix = "",
  accent = "#a5b4fc",
  icon,
  animate = true,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
  icon?: string;
  animate?: boolean;
}) => {
  const [n, setN] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) return;
    let raf: number;
    let t0: number | undefined;
    const dur = 1400;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - (t0 as number)) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);
  return (
    <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
      {icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-2)",
            color: accent,
            boxShadow: "inset 0 0 0 1px var(--border)",
          }}
        >
          <Icon name={icon} size={18} />
        </div>
      )}
      <div>
        <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: "var(--text-hi)" }}>
          {n}
          <span style={{ fontSize: 14, color: "var(--text-mid)" }}>{suffix}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".1em" }}>
          {label}
        </div>
      </div>
    </div>
  );
};

/* ------------------------ Typewriter ------------------------ */
export const Typewriter = ({
  text = "",
  speed = 20,
  onDone,
  style,
  className = "",
  cursor = true,
}: {
  text?: string;
  speed?: number;
  onDone?: () => void;
  style?: CSSProperties;
  className?: string;
  cursor?: boolean;
}) => {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (i <= text.length) {
        setShown(text.slice(0, i));
        i++;
        setTimeout(tick, speed);
      } else if (onDone) onDone();
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <span className={className} style={style}>
      {shown}
      {cursor && shown.length < text.length && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1em",
            background: "var(--text-hi)",
            verticalAlign: "middle",
            animation: "blink 1s steps(2) infinite",
          }}
        />
      )}
    </span>
  );
};

/* ------------------------ Modal ------------------------ */
export const Modal = ({
  open,
  onClose,
  children,
  width = 720,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) => {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(7,7,11,0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeUp .25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-elev"
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "88vh",
          overflow: "auto",
          borderRadius: 20,
          padding: 24,
          animation: "scaleIn .25s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ------------------------ Toast ------------------------ */
type ToastItem = { id: number; msg: string; kind: "info" | "success" };
type ToastCtxValue = { push: (msg: string, kind?: "info" | "success") => void };
const ToastCtx = React.createContext<ToastCtxValue>({ push: () => {} });

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((msg: string, kind: "info" | "success" = "info") => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 1000,
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="card-elev"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 240,
              animation: "fadeUp .25s ease",
              backdropFilter: "blur(10px)",
              background: "color-mix(in srgb, var(--bg-2) 80%, transparent)",
            }}
          >
            <Icon
              name={t.kind === "success" ? "check" : "sparkles"}
              size={16}
              style={{ color: t.kind === "success" ? "#6ee7b7" : "#a5b4fc" }}
            />
            <span style={{ fontSize: 14 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);

/* ------------------------ Tabs (magnetic underline) ------------------------ */
export const Tabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el && el.parentElement) {
      const p = el.parentElement.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setBar({ x: r.left - p.left, w: r.width });
    }
  }, [value, tabs]);
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        gap: 4,
        padding: 4,
        borderRadius: 12,
        background: "var(--bg-2)",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bar.x,
          width: bar.w,
          top: 4,
          bottom: 4,
          background: "var(--bg-0)",
          boxShadow: "inset 0 0 0 1px var(--border-strong)",
          borderRadius: 8,
          transition: "left .35s cubic-bezier(.16,1,.3,1), width .35s cubic-bezier(.16,1,.3,1)",
        }}
      />
      {tabs.map((t) => (
        <button
          key={t.value}
          ref={(el) => {
            refs.current[t.value] = el;
          }}
          onClick={() => onChange(t.value)}
          style={{
            position: "relative",
            zIndex: 1,
            background: "transparent",
            border: "none",
            color: value === t.value ? "var(--text-hi)" : "var(--text-mid)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

/* ------------------------ SectionHead ------------------------ */
export const SmallEyebrow = ({ children }: { children: ReactNode }) => (
  <div
    className="mono"
    style={{
      fontSize: 10,
      color: "var(--text-mid)",
      letterSpacing: ".14em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

export const SectionHead = ({
  eyebrow,
  title,
  sub,
  align = "left",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
}) => (
  <div style={{ textAlign: align, maxWidth: 760, margin: align === "center" ? "0 auto" : "0" }}>
    {eyebrow && <div className="pill pill-indigo" style={{ marginBottom: 18 }}>{eyebrow}</div>}
    <h2
      className="serif"
      style={{
        fontSize: "clamp(36px, 5.2vw, 64px)",
        margin: 0,
        lineHeight: 0.98,
        letterSpacing: "-.03em",
      }}
    >
      {title}
    </h2>
    {sub && (
      <p style={{ color: "var(--text-mid)", fontSize: 17, marginTop: 18, maxWidth: 600, lineHeight: 1.6 }}>
        {sub}
      </p>
    )}
  </div>
);
