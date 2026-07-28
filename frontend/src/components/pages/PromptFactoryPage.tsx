import { PromptFactoryContent } from "./prompt-factory/PromptFactoryContent";
import { WelcomeBackground } from "./welcome/WelcomeBackground";
import { WelcomeDeferredBackground } from "./welcome/WelcomeLazyVideo";

export function PromptFactoryPage() {
  return (
    <div
      data-testid="prompt-factory-page"
      className="relative min-h-screen text-white"
    >
      <WelcomeDeferredBackground>
        <WelcomeBackground />
      </WelcomeDeferredBackground>

      <PromptFactoryContent />
    </div>
  );
}
