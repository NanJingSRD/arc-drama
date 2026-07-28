/** 「接着上一次」大卡右侧信息区 — 局部动效背景（不影响整页） */
export function NowEditingPanelBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes lobby-panel-aurora {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
          50% { transform: translate(-8%, 6%) scale(1.08); opacity: 0.72; }
        }
        @keyframes lobby-panel-grid {
          from { background-position: 0 0; }
          to { background-position: 32px 32px; }
        }
        @keyframes lobby-panel-ring {
          from { transform: translate(30%, -20%) rotate(0deg); }
          to { transform: translate(30%, -20%) rotate(360deg); }
        }
        @keyframes lobby-panel-spark {
          0%, 100% { opacity: 0.15; transform: translateY(0); }
          50% { opacity: 0.85; transform: translateY(-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lobby-panel-animate { animation: none !important; }
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, rgba(8,12,28,0.92) 0%, rgba(6,10,24,0.78) 48%, rgba(10,14,32,0.88) 100%)",
        }}
      />

      <div
        className="lobby-panel-animate absolute -right-[20%] top-[-25%] h-[85%] w-[75%] rounded-full blur-[72px]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.38), transparent 68%)",
          animation: "lobby-panel-aurora 14s ease-in-out infinite",
        }}
      />
      <div
        className="lobby-panel-animate absolute -left-[15%] bottom-[-20%] h-[70%] w-[65%] rounded-full blur-[64px]"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.28), transparent 70%)",
          animation: "lobby-panel-aurora 18s ease-in-out infinite reverse",
        }}
      />

      <div
        className="lobby-panel-animate absolute -right-8 -top-8 h-44 w-44 opacity-[0.22]"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(34,211,238,0.5), rgba(99,102,241,0.35), transparent 55%, rgba(168,85,247,0.35))",
          animation: "lobby-panel-ring 24s linear infinite",
          maskImage: "radial-gradient(circle, black 35%, transparent 68%)",
          WebkitMaskImage: "radial-gradient(circle, black 35%, transparent 68%)",
        }}
      />

      <div
        className="lobby-panel-animate absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.75) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.55) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          animation: "lobby-panel-grid 20s linear infinite",
        }}
      />

      {[
        { left: "18%", top: "28%", delay: "0s" },
        { left: "72%", top: "42%", delay: "1.4s" },
        { left: "55%", top: "68%", delay: "2.2s" },
        { left: "85%", top: "22%", delay: "0.8s" },
      ].map((p, i) => (
        <span
          key={i}
          className="lobby-panel-animate absolute h-1 w-1 rounded-full"
          style={{
            left: p.left,
            top: p.top,
            background: i % 2 === 0 ? "#22D3EE" : "#6366F1",
            boxShadow: `0 0 8px ${i % 2 === 0 ? "rgba(34,211,238,0.9)" : "rgba(99,102,241,0.9)"}`,
            animation: `lobby-panel-spark ${3.5 + (i % 2)}s ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,6,23,0.55) 0%, transparent 28%, transparent 72%, rgba(2,6,23,0.35) 100%), linear-gradient(180deg, transparent 0%, rgba(2,6,23,0.25) 100%)",
        }}
      />
    </div>
  );
}
