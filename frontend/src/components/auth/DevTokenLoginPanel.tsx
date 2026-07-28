import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authenticateDevAccessToken } from "@/utils/dev-token-login";

interface DevTokenLoginPanelProps {
  onSuccess: (token: string, username: string) => void;
  compact?: boolean;
}

export function DevTokenLoginPanel({ onSuccess, compact = false }: DevTokenLoginPanelProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const value = token.trim();
    if (!value) {
      setError("请输入 Token");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await authenticateDevAccessToken(value);
      onSuccess(result.token, result.username);
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact ? (
        <p className="text-sm font-medium text-white/80">Token 登录</p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-white/35">
        线上微信登录后，在 DevTools → Application → Local Storage 复制{" "}
        <code className="text-white/55">arcreel_auth_token</code> 粘贴到下方。
      </p>
      <input
        type="text"
        value={token}
        onChange={(e) => {
          setError("");
          setToken(e.target.value);
        }}
        placeholder="粘贴 access_token"
        data-testid="debug-token-input"
        disabled={loading}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40 disabled:opacity-60"
      />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <button
        type="button"
        data-testid="debug-token-login-btn"
        onClick={() => void handleSubmit()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
            校验 Token 中…
          </>
        ) : (
          "确认登录"
        )}
      </button>
    </div>
  );
}
