import { describe, expect, it } from "vitest";
import { decryptSecret } from "@/security/encryption";
import { loadMyStyle, resetMyStyle, saveMyStyle } from "@/features/ai/my-style-service";
import { emptyMyStyle } from "@/features/ai/my-style-model";
import type {
  MyStyleRepository,
  StoredMyStyle,
  UpsertMyStyleInput,
} from "@/features/ai/my-style-repository";
import { encryptionKey } from "./ai-prompts-test-helpers";

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function repository(initialRecord: StoredMyStyle | null = null):
  MyStyleRepository & { record: StoredMyStyle | null; upserts: number } {
  return {
    record: initialRecord,
    upserts: 0,
    async deleteMyStyle() {
      this.record = null;
    },
    async getMyStyle() {
      return this.record;
    },
    async upsertMyStyle(input: UpsertMyStyleInput) {
      this.upserts += 1;
      this.record = {
        encryptedStyle: input.encryptedStyle,
        keyVersion: input.keyVersion,
        updatedAt: new Date("2026-06-14T10:00:00Z"),
      };
    },
  };
}

describe("My Style service", () => {
  it("saves structured style encrypted and loads it for the user", async () => {
    const repo = repository();

    const result = await saveMyStyle({
      encryptionKey,
      formData: form({
        audience: "Technical customers",
        constraints: "Avoid promises.",
        preferences: "Use short paragraphs.",
        role: "Support engineer",
        tone: "Warm",
      }),
      repository: repo,
      userId: "user-1",
    });

    expect(result).toMatchObject({
      code: "my-style-saved",
      ok: true,
      data: {
        style: {
          audience: "Technical customers",
          constraints: "Avoid promises.",
          preferences: "Use short paragraphs.",
          role: "Support engineer",
          tone: "Warm",
        },
      },
    });
    expect(repo.record?.encryptedStyle).not.toContain("Support engineer");
    expect(
      JSON.parse(decryptSecret(repo.record?.encryptedStyle ?? "", encryptionKey)),
    ).toMatchObject({ role: "Support engineer" });

    await expect(
      loadMyStyle({
        encryptionKey,
        repository: repo,
        userId: "user-1",
      }),
    ).resolves.toEqual(result.data);
  });

  it("rejects oversized style fields without changing storage", async () => {
    const repo = repository();
    const result = await saveMyStyle({
      encryptionKey,
      formData: form({
        audience: "",
        constraints: "",
        preferences: "",
        role: "x".repeat(161),
        tone: "",
      }),
      repository: repo,
      userId: "user-1",
    });

    expect(result).toEqual({
      code: "invalid-my-style",
      data: { style: emptyMyStyle },
      ok: false,
    });
    expect(repo.record).toBeNull();
    expect(repo.upserts).toBe(0);
  });

  it("resets an existing user style", async () => {
    const repo = repository();
    await saveMyStyle({
      encryptionKey,
      formData: form({
        audience: "Customers",
        constraints: "",
        preferences: "",
        role: "Agent",
        tone: "",
      }),
      repository: repo,
      userId: "user-1",
    });

    const result = await resetMyStyle({
      encryptionKey,
      repository: repo,
      userId: "user-1",
    });

    expect(result).toEqual({
      code: "my-style-reset",
      data: { style: emptyMyStyle },
      ok: true,
    });
    expect(repo.record).toBeNull();
  });

  it("does not write style without an authenticated user", async () => {
    const repo = repository();

    const result = await saveMyStyle({
      encryptionKey,
      formData: form({
        audience: "",
        constraints: "",
        preferences: "",
        role: "Agent",
        tone: "",
      }),
      repository: repo,
      userId: undefined,
    });

    expect(result).toEqual({
      code: "not-authenticated",
      data: { style: emptyMyStyle },
      ok: false,
    });
    expect(repo.record).toBeNull();
  });
});
