ALTER TABLE "WorkspaceAiSetting"
  ADD COLUMN "usersCanEditMyStyle" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "usersCanEditAiRephraseStyleOverrides" BOOLEAN NOT NULL DEFAULT false;
