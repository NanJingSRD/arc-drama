import { W3 } from "./workspace-web3-theme";

type BackgroundVariant = "web3" | "flat" | "studio";

export function WorkspaceWeb3Background({
  hideCenterRing = false,
  variant = "web3",
}: {
  hideCenterRing?: boolean;
  variant?: BackgroundVariant;
}) {
  if (variant === "studio") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 110% 70% at 50% -25%, rgba(99,102,241,0.14) 0%, transparent 52%)",
              "radial-gradient(ellipse 55% 45% at 92% 88%, rgba(34,211,238,0.07) 0%, transparent 50%)",
              "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 35%, rgba(0,0,0,0.55) 100%)",
              "linear-gradient(180deg, #07070d 0%, #030305 100%)",
            ].join(", "),
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 90% 75% at 50% 30%, black 15%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 75% at 50% 30%, black 15%, transparent 80%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>
    );
  }

  if (variant === "flat") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.14 0.004 265) 0%, oklch(0.10 0.002 265) 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes w3-aurora-a {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
          33% { transform: translate(8%, 5%) scale(1.12); opacity: 0.78; }
          66% { transform: translate(-6%, 8%) scale(0.92); opacity: 0.48; }
        }
        @keyframes w3-aurora-b {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.42; }
          50% { transform: translate(-10%, -6%) scale(1.15); opacity: 0.68; }
        }
        @keyframes w3-aurora-c {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.35; }
          50% { transform: translate(6%, -10%) rotate(12deg); opacity: 0.58; }
        }
        @keyframes w3-grid-drift {
          from { transform: perspective(900px) rotateX(68deg) translateY(0); }
          to { transform: perspective(900px) rotateX(68deg) translateY(56px); }
        }
        @keyframes w3-dot-drift {
          from { transform: translateY(0); }
          to { transform: translateY(32px); }
        }
        @keyframes w3-beam {
          0%, 100% { opacity: 0.35; transform: translateX(-50%) scaleX(1); }
          50% { opacity: 0.72; transform: translateX(-50%) scaleX(1.18); }
        }
        @keyframes w3-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes w3-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.12; }
          50% { transform: translateY(-28px) translateX(10px); opacity: 0.65; }
        }
        @keyframes w3-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          8% { opacity: 0.35; }
          92% { opacity: 0.35; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .w3-bg-animate { animation: none !important; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[#020617]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(34,211,238,0.14) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 50%, rgba(99,102,241,0.12) 0%, transparent 50%), linear-gradient(180deg, #050816 0%, #020617 45%, #010409 100%)",
        }}
      />

      {!hideCenterRing ? (
      <div
        className="absolute left-1/2 top-1/2 h-[min(90vw,780px)] w-[min(90vw,780px)] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="w3-bg-animate h-full w-full rounded-full opacity-[0.22] blur-[2px]"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(34,211,238,0.55), rgba(99,102,241,0.45), rgba(168,85,247,0.5), rgba(52,211,153,0.35), rgba(34,211,238,0.55))",
            animation: "w3-ring-spin 48s linear infinite",
            maskImage: "radial-gradient(circle, transparent 42%, black 52%, transparent 62%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 42%, black 52%, transparent 62%)",
          }}
        />
      </div>
      ) : null}

      <div
        className="w3-bg-animate absolute -left-[12%] top-[4%] h-[58vh] w-[58vw] rounded-full blur-[110px]"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.55), transparent 68%)",
          animation: "w3-aurora-a 16s ease-in-out infinite",
        }}
      />
      <div
        className="w3-bg-animate absolute -right-[8%] top-[14%] h-[50vh] w-[48vw] rounded-full blur-[100px]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.52), transparent 68%)",
          animation: "w3-aurora-b 20s ease-in-out infinite",
        }}
      />
      <div
        className="w3-bg-animate absolute bottom-[6%] left-[18%] h-[44vh] w-[52vw] rounded-full blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.42), transparent 68%)",
          animation: "w3-aurora-c 24s ease-in-out infinite",
        }}
      />
      <div
        className="w3-bg-animate absolute bottom-[18%] right-[12%] h-[32vh] w-[36vw] rounded-full blur-[90px]"
        style={{
          background: "radial-gradient(circle, rgba(52,211,153,0.28), transparent 70%)",
          animation: "w3-aurora-b 28s ease-in-out infinite reverse",
        }}
      />

      <div
        className="w3-bg-animate absolute left-1/2 top-0 h-[520px] w-[min(92vw,960px)] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 50% 0%, rgba(34,211,238,0.22), rgba(99,102,241,0.08) 45%, transparent 72%)",
          animation: "w3-beam 7s ease-in-out infinite",
        }}
      />

      <div
        className="w3-bg-animate absolute inset-x-0 bottom-0 h-[55vh] origin-bottom opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.85) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.75) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(to top, black 15%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to top, black 15%, transparent 88%)",
          animation: "w3-grid-drift 14s linear infinite",
        }}
      />

      <div
        className="w3-bg-animate absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: "radial-gradient(rgba(34,211,238,0.9) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 95% 85% at 50% 35%, black 10%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 95% 85% at 50% 35%, black 10%, transparent 78%)",
          animation: "w3-dot-drift 10s linear infinite",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.9) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {[
        { left: "12%", top: "22%", delay: "0s", size: 3 },
        { left: "28%", top: "38%", delay: "1.2s", size: 2 },
        { left: "44%", top: "18%", delay: "2.4s", size: 4 },
        { left: "62%", top: "32%", delay: "0.8s", size: 2 },
        { left: "78%", top: "24%", delay: "1.8s", size: 3 },
        { left: "88%", top: "42%", delay: "3s", size: 2 },
        { left: "18%", top: "58%", delay: "2s", size: 2 },
        { left: "52%", top: "52%", delay: "1.5s", size: 3 },
        { left: "72%", top: "62%", delay: "2.6s", size: 2 },
      ].map((p, i) => (
        <span
          key={i}
          className="w3-bg-animate absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? W3.cyan : i % 3 === 1 ? W3.blue : W3.violet,
            boxShadow: `0 0 ${p.size * 4}px ${i % 3 === 0 ? "rgba(34,211,238,0.8)" : i % 3 === 1 ? "rgba(99,102,241,0.8)" : "rgba(168,85,247,0.8)"}`,
            animation: `w3-particle ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div
        className="w3-bg-animate absolute inset-x-0 top-0 h-32 opacity-30"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(34,211,238,0.12) 48%, rgba(99,102,241,0.08) 52%, transparent)",
          animation: "w3-scan 9s linear infinite",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 30%, rgba(2,6,23,0.55) 100%), linear-gradient(180deg, rgba(2,6,23,0.25) 0%, rgba(2,6,23,0.45) 50%, rgba(1,4,9,0.82) 100%)",
        }}
      />
    </div>
  );
}
