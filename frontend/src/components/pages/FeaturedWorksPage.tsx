import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { VideoStream } from "./welcome/VideoStream";
import { useFeaturedWorks } from "./welcome/useFeaturedWorks";
import { WelcomeBackground } from "./welcome/WelcomeBackground";
import { WelcomeDeferredBackground } from "./welcome/WelcomeLazyVideo";

export function FeaturedWorksPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { works, loading, error } = useFeaturedWorks({ keyword: debouncedSearch });

  return (
    <div
      data-testid="featured-works-page"
      className="relative min-h-screen text-white"
    >
      <WelcomeDeferredBackground>
        <WelcomeBackground />
      </WelcomeDeferredBackground>

      <VideoStream
        works={works}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
