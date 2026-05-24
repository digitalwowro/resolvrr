type WorkspaceDateTimeOptions = {
  now?: Date;
};

const currentYearFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
});

const otherYearFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatWorkspaceDateTime(
  date: Date,
  { now = new Date() }: WorkspaceDateTimeOptions = {},
) {
  const formatter =
    date.getFullYear() === now.getFullYear()
      ? currentYearFormatter
      : otherYearFormatter;

  return formatter.format(date);
}
