import { describe, expect, it } from "vitest";
import {
  buildBasicAuthHeader,
  normalizeZammadBaseUrl,
} from "@/providers/zammad/credentials";
import { zammadProviderPlugin } from "@/providers/zammad";

describe("Zammad Basic Auth credentials", () => {
  it("normalizes base URLs without path slashes, search, or hash", () => {
    expect(normalizeZammadBaseUrl("https://helpdesk.example.com///?x=1#y")).toBe(
      "https://helpdesk.example.com",
    );
  });

  it("normalizes API base URLs back to the instance root", () => {
    expect(
      normalizeZammadBaseUrl("https://helpdesk.example.com/api/v1/"),
    ).toBe("https://helpdesk.example.com");
    expect(
      normalizeZammadBaseUrl("https://helpdesk.example.com/support/api/v1/"),
    ).toBe("https://helpdesk.example.com/support");
  });

  it("builds a Basic Auth header", () => {
    expect(
      buildBasicAuthHeader({ username: "agent", password: "secret" }),
    ).toBe("Basic YWdlbnQ6c2VjcmV0");
  });

  it("keeps base URL on the helpdesk connection, not the credential payload", () => {
    const basicAuth = zammadProviderPlugin.credentialSchemes.find(
      (scheme) => scheme.key === "basic-auth",
    );

    expect(basicAuth?.fields.map((field) => field.name)).toEqual([
      "username",
      "password",
    ]);
  });
});
