import { BRAND } from "@/branding";
import { WELCOME_SECTION_WIDE } from "./welcome-layout";

export function WelcomeFooter() {
  return (
    <footer className="mt-4 border-t border-white/6 bg-[#06080f]/60 backdrop-blur-md">
      <div className={`${WELCOME_SECTION_WIDE} grid gap-10 py-12 sm:grid-cols-3`}>
        <div>
          <div className="text-lg font-bold text-cyan-400">{BRAND.name}</div>
          <div className="mt-3 space-y-1 text-xs leading-relaxed text-white/40">
            <p>客服热线：400-000-0000</p>
            <p>邮箱：support@example.com</p>
            <p>地址：江苏省南京市</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          {[
            { label: "首页", href: "/app/home" },
            { label: "精选作品", href: "/app/featured" },
            { label: "提示词工厂", href: "/app/prompt-factory" },
            { label: "工作空间", href: "/app/projects" },
          ].map(({ label, href }) => (
            <a key={label} href={href} className="text-cyan-400/80 transition hover:text-cyan-300">
              {label}
            </a>
          ))}
        </div>
        <div className="flex gap-4">
          {["微信公众号", "官方用户群"].map((label) => (
            <div key={label} className="text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-[10px] text-white/30">
                QR
              </div>
              <p className="mt-1.5 text-[11px] text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={`${WELCOME_SECTION_WIDE} border-t border-white/4 py-4 text-center text-[10px] text-white/25`}>
        <p>Copyright by Example Company Limited · 苏ICP备15011620号-3</p>
      </div>
    </footer>
  );
}
