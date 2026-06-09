import { describe, expect, it } from "vitest";
import {
  communicationBodyHasText,
  normalizedCommunicationBody,
} from "@/features/tickets/communication-body";

describe("communication body text detection", () => {
  it("detects visible text in html-like bodies", () => {
    expect(communicationBodyHasText("<p>Hello&nbsp;there</p>")).toBe(true);
    expect(normalizedCommunicationBody("  <p>Hello</p>  ")).toBe("<p>Hello</p>");
  });

  it("rejects bodies without visible text", () => {
    expect(communicationBodyHasText("  ")).toBe(false);
    expect(communicationBodyHasText("&nbsp;")).toBe(false);
    expect(communicationBodyHasText("<p><br></p>")).toBe(false);
    expect(communicationBodyHasText("<script>alert(1)</script>")).toBe(false);
    expect(normalizedCommunicationBody("<script>alert(1)</script>")).toBe("");
  });

  it("does not rely on one-pass regex tag stripping for malformed script input", () => {
    const payload = "<scrip<script>alert(1)</script>t>alert(2)</script>";

    expect(communicationBodyHasText(payload)).toBe(true);
    expect(normalizedCommunicationBody(payload)).toBe(payload);
  });
});
