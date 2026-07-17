-- Persist an explicit List selection as a retryable taskbar deactivation.

ALTER TYPE "TaskbarSyncOperationKind" ADD VALUE 'DEACTIVATE';
