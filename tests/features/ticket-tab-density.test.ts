import { describe, expect, it } from "vitest";
import {
  horizontalTicketTabDensity,
  visibleIconTicketTabCount,
} from "@/features/workspace/components/ticket-tabs/density";

describe("horizontalTicketTabDensity", () => {
  it("uses compact tabs only when ID-only labels have room", () => {
    expect(horizontalTicketTabDensity(1_316, 10)).toBe("compact");
    expect(horizontalTicketTabDensity(1_315, 10)).toBe("icon");
  });

  it("uses full tabs when titles have enough room", () => {
    expect(horizontalTicketTabDensity(1_796, 10)).toBe("full");
  });

  it("keeps icon overflow count within the available strip", () => {
    expect(visibleIconTicketTabCount(120, 5)).toBe(3);
  });
});
