-- Remove the automatic taskbar reconciliation outbox and compatibility state.
-- Ticket tabs are now imported explicitly through a read-only provider call.
DROP TABLE IF EXISTS "TaskbarSyncOperation";
DROP TABLE IF EXISTS "TaskbarSyncState";

DROP TYPE IF EXISTS "TaskbarSyncOperationKind";
DROP TYPE IF EXISTS "TaskbarSyncCompatibility";
