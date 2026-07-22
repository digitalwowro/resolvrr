export const TICKET_DETAIL_LOAD_TIMEOUT_MS = 20_000;

export function withTicketDetailRequestTimeout<T>(
  request: Promise<T>,
  timeoutMs = TICKET_DETAIL_LOAD_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Ticket detail request timed out.")),
      timeoutMs,
    );

    request.then(
      (result) => {
        window.clearTimeout(timeout);
        resolve(result);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
