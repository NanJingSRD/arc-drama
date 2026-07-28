import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { BlockingOverlay } from "@/components/ui/BlockingOverlay";
import { useAppStore } from "@/stores/app-store";

describe("BlockingOverlay", () => {
  beforeEach(() => {
    useAppStore.setState({ blockingOverlay: null });
    document.body.style.overflow = "";
  });

  it("renders nothing when blockingOverlay is null", () => {
    render(<BlockingOverlay />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("portals a full-screen status overlay when blockingOverlay is set", () => {
    useAppStore.setState({ blockingOverlay: "Authorizing storyboard…" });
    render(<BlockingOverlay />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Authorizing storyboard…");
    expect(document.body.style.overflow).toBe("hidden");
  });
});
