ALTER TABLE "TicketSnapshotCache"
ADD COLUMN "encryptedDetailJson" TEXT,
ADD COLUMN "sourceVersion" TEXT NOT NULL DEFAULT 'ticket-detail-v1';
