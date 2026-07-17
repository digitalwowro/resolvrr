import { decryptSecret } from "@/security/encryption";
import { sanitizeSignatureTemplateHtml } from "@/security/sanitize-html";
import type { ProviderLookupOption } from "@/core/providers";
import type { WorkspaceAccess } from "@/features/helpdesk-connections/repository";
import type { WorkspaceSignatureSettingsData } from "./model";
import type { WorkspaceSignatureRepository } from "./repository";

export async function workspaceSignatureSettingsData(input: {
  access: WorkspaceAccess;
  encryptionKey: string;
  groupOptions?: ProviderLookupOption[];
  repository: WorkspaceSignatureRepository;
  workspaceId: string;
}): Promise<WorkspaceSignatureSettingsData | undefined> {
  const configuration = await input.repository.getConfiguration(input.workspaceId);
  if (!configuration) return undefined;
  return {
    canManage: input.access.role === "ADMIN",
    groupOptions: input.groupOptions ?? [],
    source: configuration.source,
    templates: configuration.templates.flatMap((template) => {
      try {
        return [{
          bodyHtml: sanitizeSignatureTemplateHtml(
            decryptSecret(template.encryptedBodyHtml, input.encryptionKey),
          ),
          contextVersion: template.contextVersion,
          groupExternalId: template.groupExternalId,
          id: template.id,
        }];
      } catch {
        return [];
      }
    }),
    workspaceLabel: configuration.workspaceDisplayName,
  };
}
