import { describe, expect, it } from "vitest";
import { ProviderError } from "@/core/providers";
import {
  assertReviewedTicketSignature,
  saveWorkspaceSignatureTemplate,
} from "@/features/signatures/service";
import type { WorkspaceSignatureRepository } from "@/features/signatures/repository";
import { decryptSecret } from "@/security/encryption";

describe("workspace ticket signatures", () => {
  it("fails closed when the reviewed signature version is stale", () => {
    expect(() => assertReviewedTicketSignature(
      { contextVersion: "old", source: "zammad" },
      { contextVersion: "new", source: "zammad" },
    )).toThrowError(ProviderError);
    try {
      assertReviewedTicketSignature(
        { contextVersion: "old", source: "zammad" },
        { contextVersion: "new", source: "zammad" },
      );
    } catch (error) {
      expect(error).toMatchObject({ diagnosticCode: "signature-context-stale" });
    }
  });

  it("sanitizes templates before encrypted persistence", async () => {
    let encryptedBodyHtml = "";
    const repository = {
      async upsertTemplate(
        input: Parameters<WorkspaceSignatureRepository["upsertTemplate"]>[0],
      ) { encryptedBodyHtml = input.encryptedBodyHtml; },
    } as unknown as WorkspaceSignatureRepository;
    const saved = await saveWorkspaceSignatureTemplate({
      bodyHtml: '<p>Hello {{user.displayName}}</p><script>alert(1)</script>',
      createdByUserId: "user-1",
      encryptionKey: "test-encryption-key-that-is-long-enough-123",
      repository,
      workspaceId: "workspace-1",
    });
    expect(saved).toBe(true);
    expect(encryptedBodyHtml).toBeTruthy();
    expect(decryptSecret(
      encryptedBodyHtml,
      "test-encryption-key-that-is-long-enough-123",
    )).toBe("<p>Hello {{user.displayName}}</p>");
  });
});
