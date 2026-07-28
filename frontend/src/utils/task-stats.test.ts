import { describe, expect, it } from "vitest";
import { makeTask } from "@/test/factories";
import { computeTaskStatsFromTasks } from "./task-stats";

describe("computeTaskStatsFromTasks", () => {
  it("aggregates counts by status", () => {
    const stats = computeTaskStatsFromTasks([
      makeTask({ task_id: "1", status: "queued" }),
      makeTask({ task_id: "2", status: "running" }),
      makeTask({ task_id: "3", status: "failed" }),
      makeTask({ task_id: "4", status: "failed" }),
    ]);

    expect(stats).toEqual({
      queued: 1,
      running: 1,
      cancelling: 0,
      succeeded: 0,
      failed: 2,
      cancelled: 0,
      total: 4,
    });
  });
});
