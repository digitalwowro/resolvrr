export function cacheAgeBucket(input: {
  fetchedAt: Date;
  now: Date;
}): string {
  const ageMs = Math.max(0, input.now.getTime() - input.fetchedAt.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;

  if (ageMs < minuteMs) {
    return "lt-1m";
  }
  if (ageMs < 5 * minuteMs) {
    return "1m-5m";
  }
  if (ageMs < 30 * minuteMs) {
    return "5m-30m";
  }
  if (ageMs < 2 * hourMs) {
    return "30m-2h";
  }
  if (ageMs < 24 * hourMs) {
    return "2h-24h";
  }
  return "gt-24h";
}
