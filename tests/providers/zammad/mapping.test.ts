import { describe, expect, it } from "vitest";
import { mapPriority, mapState } from "@/providers/zammad/mapping";

describe("zammad canonical mapping", () => {
  it("maps Zammad states to canonical ticket state keys", () => {
    expect(mapState("new")).toBe("new");
    expect(mapState("open")).toBe("open");
    expect(mapState("pending reminder")).toBe("pending_reminder");
    expect(mapState("pending close")).toBe("pending_close");
    expect(mapState("closed")).toBe("closed");
  });

  it("maps Zammad priorities to canonical ticket priority keys", () => {
    expect(mapPriority("1 low")).toBe("low");
    expect(mapPriority("2 normal")).toBe("medium");
    expect(mapPriority("3 high")).toBe("high");
  });

  it("omits unknown provider values", () => {
    expect(mapState("waiting")).toBeUndefined();
    expect(mapPriority("4 urgent")).toBeUndefined();
  });
});
