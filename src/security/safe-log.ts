export type SafeLogMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export function safeLogMetadata(metadata: SafeLogMetadata): SafeLogMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}
