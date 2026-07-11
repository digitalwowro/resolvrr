-- RenameIndex
ALTER INDEX "ai_summary_cache_identity" RENAME TO "AiSummaryCache_userId_helpdeskConnectionId_providerTicketId_key";

-- RenameIndex
ALTER INDEX "UserAiRephraseStyleOverride_userId_helpdeskConnectionId_styleId" RENAME TO "UserAiRephraseStyleOverride_userId_helpdeskConnectionId_sty_key";
