import { describe, expect, it } from "vitest";
import {
  parseWorkspaceV2ProjectDetailNav,
  workspaceV2ProjectAssetPath,
  workspaceV2ProjectCompletedHref,
  workspaceV2ProjectEntryHref,
  workspaceV2ProjectEpisodesHref,
  workspaceV2ProjectOverviewPath,
  workspaceV2ProjectProductionHref,
  workspaceV2NavToWorkflowStep,
  workspaceV2WorkflowStepHref,
  workspaceV2WorkflowStepNestPath,
  WORKSPACE_V2_NAVIGABLE_WORKFLOW_STEPS,
} from "./workspace-v2-project-paths";

describe("workspaceV2WorkflowStepHref", () => {
  const projectId = "proj-0379a4d4";

  it("maps workflow steps to routes", () => {
    expect(workspaceV2WorkflowStepHref(projectId, "script_import")).toBe(
      "~/app/workspace-v2/proj-0379a4d4/overview",
    );
    expect(workspaceV2WorkflowStepHref(projectId, "script_episoding")).toBe(
      "~/app/workspace-v2/proj-0379a4d4/episodes",
    );
    expect(workspaceV2WorkflowStepHref(projectId, "asset_generation")).toBe(
      "~/app/workspace-v2/proj-0379a4d4/assets/characters",
    );
    expect(workspaceV2WorkflowStepHref(projectId, "production")).toBe(
      "~/app/workspace-v2/proj-0379a4d4/production",
    );
    expect(workspaceV2WorkflowStepHref(projectId, "completed")).toBe(
      "~/app/workspace-v2/proj-0379a4d4/completed",
    );
  });

  it("maps nest-relative paths for Redirect", () => {
    expect(workspaceV2WorkflowStepNestPath("script_import")).toBe("/overview");
    expect(workspaceV2WorkflowStepNestPath("script_episoding")).toBe("/episodes");
    expect(workspaceV2WorkflowStepNestPath("asset_generation")).toBe("/assets/characters");
    expect(workspaceV2WorkflowStepNestPath("production")).toBe("/production");
    expect(workspaceV2WorkflowStepNestPath("completed")).toBe("/completed");
  });

  it("entry href lands on current progress step", () => {
    expect(workspaceV2ProjectEntryHref(projectId, "asset_generation")).toBe(
      "~/app/workspace-v2/proj-0379a4d4/assets/characters",
    );
  });
});

describe("workspaceV2NavToWorkflowStep", () => {
  it("maps detail nav ids to workflow steps", () => {
    expect(workspaceV2NavToWorkflowStep("overview")).toBe("script_import");
    expect(workspaceV2NavToWorkflowStep("episode-management")).toBe("script_episoding");
    expect(workspaceV2NavToWorkflowStep("asset-library")).toBe("asset_generation");
    expect(workspaceV2NavToWorkflowStep("production")).toBe("production");
    expect(workspaceV2NavToWorkflowStep("completed")).toBe("completed");
  });
});

describe("WORKSPACE_V2_NAVIGABLE_WORKFLOW_STEPS", () => {
  it("includes all workflow nodes", () => {
    expect(WORKSPACE_V2_NAVIGABLE_WORKFLOW_STEPS).toEqual([
      "script_import",
      "script_episoding",
      "asset_generation",
      "production",
      "completed",
    ]);
  });
});

describe("workspace-v2-project-paths", () => {
  const projectId = "proj-0379a4d4";

  it("builds sub-route paths", () => {
    expect(workspaceV2ProjectOverviewPath(projectId)).toBe(
      "/app/workspace-v2/proj-0379a4d4/overview",
    );
    expect(workspaceV2ProjectAssetPath(projectId, "characters")).toBe(
      "/app/workspace-v2/proj-0379a4d4/assets/characters",
    );
    expect(workspaceV2ProjectEpisodesHref(projectId)).toBe(
      "~/app/workspace-v2/proj-0379a4d4/episodes",
    );
    expect(workspaceV2ProjectProductionHref(projectId)).toBe(
      "~/app/workspace-v2/proj-0379a4d4/production",
    );
    expect(workspaceV2ProjectCompletedHref(projectId)).toBe(
      "~/app/workspace-v2/proj-0379a4d4/completed",
    );
  });

  it("parses active nav from full pathname", () => {
    expect(
      parseWorkspaceV2ProjectDetailNav(
        `/app/workspace-v2/${projectId}/overview`,
        projectId,
      ),
    ).toEqual({ activeNav: "overview", activeAssetSubNav: "characters" });

    expect(
      parseWorkspaceV2ProjectDetailNav(
        `/app/workspace-v2/${projectId}/assets/scenes`,
        projectId,
      ),
    ).toEqual({ activeNav: "asset-library", activeAssetSubNav: "scenes" });

    expect(
      parseWorkspaceV2ProjectDetailNav(
        `/app/workspace-v2/${projectId}/episodes`,
        projectId,
      ),
    ).toEqual({ activeNav: "episode-management", activeAssetSubNav: "characters" });

    expect(
      parseWorkspaceV2ProjectDetailNav(
        `/app/workspace-v2/${projectId}/production`,
        projectId,
      ),
    ).toEqual({ activeNav: "production", activeAssetSubNav: "characters" });

    expect(
      parseWorkspaceV2ProjectDetailNav(
        `/app/workspace-v2/${projectId}/completed`,
        projectId,
      ),
    ).toEqual({ activeNav: "completed", activeAssetSubNav: "characters" });
  });

  it("parses active nav from wouter nest-relative pathname", () => {
    expect(parseWorkspaceV2ProjectDetailNav("/assets/props", projectId)).toEqual({
      activeNav: "asset-library",
      activeAssetSubNav: "props",
    });
    expect(parseWorkspaceV2ProjectDetailNav("/episodes", projectId)).toEqual({
      activeNav: "episode-management",
      activeAssetSubNav: "characters",
    });
    expect(parseWorkspaceV2ProjectDetailNav("/production", projectId)).toEqual({
      activeNav: "production",
      activeAssetSubNav: "characters",
    });
    expect(parseWorkspaceV2ProjectDetailNav("/completed", projectId)).toEqual({
      activeNav: "completed",
      activeAssetSubNav: "characters",
    });
  });
});
