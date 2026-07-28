import { HeroCarousel } from "./welcome/HeroCarousel";
import { WelcomeBackground } from "./welcome/WelcomeBackground";
import { WelcomeCtaBar } from "./welcome/WelcomeCtaBar";
import { WelcomeDeferredBackground } from "./welcome/WelcomeLazyVideo";
import { WELCOME_FIRST_SCREEN_CLASS } from "./welcome/welcome-layout";
import { useHeroSlides } from "./welcome/useHeroSlides";

export function WelcomePage() {
  const { slides, loading, error } = useHeroSlides();

  return (
    <div
      data-testid="welcome-page"
      className="relative text-white"
    >
      <WelcomeDeferredBackground>
        <WelcomeBackground />
      </WelcomeDeferredBackground>

      <div className={WELCOME_FIRST_SCREEN_CLASS}>
        <HeroCarousel slides={slides} loading={loading} error={error} />
        <WelcomeCtaBar />
      </div>
    </div>
  );
}
