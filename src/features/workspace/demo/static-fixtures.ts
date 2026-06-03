import type {
  StaticColumn,
  StaticProfileAction,
  StaticProfileWorkspace,
  StaticSavedView,
  StaticTabOrientation,
  StaticTicketReply,
  StaticTicketRow,
  StaticTicketTab,
} from "./static-types";

// Static workspace fixtures are feature-local review data, not app domain data.
export const staticSavedViews: StaticSavedView[] = [
  { id: "my-work", label: "My work" },
  { id: "open", label: "Open tickets" },
  { id: "pending", label: "Pending reminders" },
  { id: "unassigned", label: "Unassigned tickets" },
  { id: "high-priority", label: "High priority" },
];

export const staticProfileWorkspaces: StaticProfileWorkspace[] = [
  { id: "northwind", label: "Northwind Support" },
  { id: "contoso", label: "Contoso Care" },
  { id: "fabrikam", label: "Fabrikam Desk" },
];

export const staticProfileActions: StaticProfileAction[] = [
  { id: "preferences", label: "Preferences" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "settings", label: "Settings" },
];

const baseTicketTabs: StaticTicketTab[] = [
  {
    id: "48291",
    label: "#48291 Billing follow-up",
    title: "Billing follow-up for annual renewal",
    customer: "Maya Patel",
    owner: "R. Rosca",
    priority: "High",
    state: "Open",
    unread: true,
  },
  {
    id: "48288",
    label: "#48288 Login loop",
    title: "Login loop after password reset",
    customer: "Daniel Cho",
    owner: "N. Ionescu",
    priority: "High",
    state: "Pending Reminder",
    dirty: true,
  },
  {
    id: "48277",
    label: "#48277 Webhook delivery",
    title: "Webhook delivery failed overnight",
    customer: "Owen Brooks",
    owner: "A. Pop",
    priority: "High",
    state: "Open",
  },
  {
    id: "48271",
    label: "#48271 Plan change",
    title: "Plan change for regional team",
    customer: "Elena Vasquez",
    owner: "M. Stan",
    priority: "Medium",
    state: "Pending Close",
  },
  {
    id: "48255",
    label: "#48255 Invoice copy",
    title: "Invoice copy requested",
    customer: "Initech Service Desk",
    owner: "Unassigned",
    priority: "Medium",
    state: "New",
    loading: true,
  },
];

const baseTicketRows: StaticTicketRow[] = [
  {
    id: "48291",
    number: "#48291",
    title: "Billing follow-up for annual renewal",
    customer: "Maya Patel",
    owner: "R. Rosca",
    state: "Open",
    priority: "High",
    pendingTill: "Today 15:40",
    createdAt: "May 20, 09:12",
    updatedAt: "4m ago",
    preview: "Customer replied with purchase order details and asks for confirmation.",
  },
  {
    id: "48288",
    number: "#48288",
    title: "Login loop after password reset",
    customer: "Daniel Cho",
    owner: "N. Ionescu",
    state: "Pending Reminder",
    priority: "High",
    pendingTill: "Today 16:05",
    createdAt: "May 21, 13:48",
    updatedAt: "12m ago",
    preview: "Session appears to restart after MFA challenge on Chrome.",
  },
  {
    id: "48284",
    number: "#48284",
    title: "Need VAT details added to receipt",
    customer: "Sofia Martin",
    owner: "Unassigned",
    state: "New",
    priority: "Medium",
    pendingTill: "Today 17:10",
    createdAt: "May 22, 10:35",
    updatedAt: "19m ago",
    preview: "Customer needs updated billing profile before accounting close.",
  },
  {
    id: "48277",
    number: "#48277",
    title: "Webhook delivery failed overnight",
    customer: "Owen Brooks",
    owner: "A. Pop",
    state: "Open",
    priority: "High",
    pendingTill: "Today 15:31",
    createdAt: "May 22, 14:08",
    updatedAt: "26m ago",
    preview: "Several webhook attempts returned 503 during a customer deployment.",
  },
  {
    id: "48271",
    number: "#48271",
    title: "Plan change for regional team",
    customer: "Elena Vasquez",
    owner: "R. Rosca",
    state: "Pending Close",
    priority: "Medium",
    pendingTill: "Tomorrow 09:00",
    createdAt: "May 23, 08:24",
    updatedAt: "31m ago",
    preview: "Sales-approved plan change is waiting for customer billing contact.",
  },
  {
    id: "48268",
    number: "#48268",
    title: "Export contains duplicate rows",
    customer: "Kenji Mori",
    owner: "M. Stan",
    state: "Open",
    priority: "Medium",
    pendingTill: "Today 16:35",
    createdAt: "May 23, 11:50",
    updatedAt: "44m ago",
    preview: "CSV export duplicates rows when date range crosses a month boundary.",
  },
  {
    id: "48260",
    number: "#48260",
    title: "Close old onboarding request",
    customer: "Priya Shah",
    owner: "N. Ionescu",
    state: "Closed",
    priority: "Low",
    pendingTill: "-",
    createdAt: "May 18, 15:20",
    updatedAt: "1h ago",
    preview: "Customer confirmed the onboarding checklist is complete.",
  },
];

const generatedTitles = [
  "Payment confirmation needed",
  "Customer cannot update profile",
  "Email notifications delayed",
  "Portal invitation expired",
  "Subscription renewal question",
  "Invoice address mismatch",
  "Webhook retry requested",
  "Account access review",
  "Plan downgrade follow-up",
  "CSV export missing filters",
  "Agent assignment question",
  "Billing contact update",
];

const generatedCustomers = [
  "Northwind Support",
  "Contoso Care",
  "Fabrikam Desk",
  "Acme Robotics",
  "Globex Operations",
  "Initech Service Desk",
  "Umbrella Logistics",
  "Stark Industries",
  "Wayne Enterprises",
  "Hooli Support",
];

const generatedOwners = [
  "R. Rosca",
  "N. Ionescu",
  "A. Pop",
  "M. Stan",
  "Unassigned",
];

const generatedStates: StaticTicketRow["state"][] = [
  "New",
  "Open",
  "Pending Reminder",
  "Pending Close",
  "Closed",
];

const generatedPriorities: StaticTicketRow["priority"][] = [
  "Low",
  "Medium",
  "High",
];

const generatedPendingLabels = [
  "Now",
  "In 4m",
  "Today 15:40",
  "Today 17:25",
  "Tomorrow 09:00",
  "Tomorrow 16:05",
  "May 27, 14:35",
  "May 30, 10:20",
];

const generatedUpdatedLabels = [
  "Now",
  "4m ago",
  "18m ago",
  "Today 15:40",
  "Yesterday 16:05",
  "May 17, 14:35",
  "May 14, 09:20",
  "May 12, 11:10",
];

const generatedCreatedLabels = [
  "May 24, 08:40",
  "May 23, 14:15",
  "May 22, 09:30",
  "May 21, 16:45",
  "May 20, 11:05",
  "May 19, 13:25",
  "May 18, 10:10",
  "May 17, 09:50",
];

const generatedRows: StaticTicketRow[] = Array.from({ length: 93 }, (_, index) => {
  const number = 48259 - index;
  const state = generatedStates[index % generatedStates.length];
  const priority = generatedPriorities[index % generatedPriorities.length];

  return {
    id: String(number),
    number: `#${number}`,
    title: generatedTitles[index % generatedTitles.length],
    customer: generatedCustomers[index % generatedCustomers.length],
    owner: generatedOwners[index % generatedOwners.length],
    state,
    priority,
    pendingTill:
      state === "Closed"
        ? "-"
        : generatedPendingLabels[index % generatedPendingLabels.length],
    createdAt: generatedCreatedLabels[index % generatedCreatedLabels.length],
    updatedAt: generatedUpdatedLabels[index % generatedUpdatedLabels.length],
    preview: "Synthetic workspace review row for table density and scrolling.",
  };
});

export const staticTicketRows: StaticTicketRow[] = [
  ...baseTicketRows,
  ...generatedRows,
];

const replyBodies = [
  "Thanks, I checked the latest account activity and the issue is still reproducible from our side.",
  "We reviewed the request and queued the next verification step for the support team.",
  "Internal context: keep the customer-facing answer short and confirm the exact next action before closing.",
];

export function staticTicketReplies(ticket: StaticTicketRow): StaticTicketReply[] {
  const customerSlug = ticket.customer
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  const customerEmail = `${customerSlug || "customer"}@example.com`;
  const ticketOwner =
    ticket.owner === "Unassigned" ? "Razvan Rosca" : ticket.owner;

  return [
    {
      id: `${ticket.id}-reply-customer`,
      ticketId: ticket.id,
      type: "customer",
      authorName: ticket.customer,
      authorEmail: customerEmail,
      recipients: [
        { name: ticketOwner, email: "razvan.rosca@resolvrr.test" },
        { name: "Support Team", email: "support@resolvrr.test" },
      ],
      createdAt: "May 24, 08:18",
      body: ticket.preview,
    },
    {
      id: `${ticket.id}-reply-employee`,
      ticketId: ticket.id,
      type: "employee",
      authorName: ticketOwner,
      authorEmail: "razvan.rosca@resolvrr.test",
      recipients: [{ name: ticket.customer, email: customerEmail }],
      createdAt: "May 24, 08:04",
      body: replyBodies[1],
    },
    {
      id: `${ticket.id}-reply-note`,
      ticketId: ticket.id,
      type: "internal-note",
      authorName: "Razvan Rosca",
      authorEmail: "razvan.rosca@resolvrr.test",
      recipients: [{ name: "Support Team", email: "support@resolvrr.test" }],
      createdAt: "May 23, 16:30",
      body: replyBodies[2],
    },
  ];
}

const generatedTicketTabs: StaticTicketTab[] = staticTicketRows
  .filter((row) => !baseTicketTabs.some((tab) => tab.id === row.id))
  .slice(0, 0)
  .map((row) => ({
    id: row.id,
    label: `${row.number} ${row.title}`,
    title: row.title,
    customer: row.customer,
    owner: row.owner,
    priority: row.priority,
    state: row.state,
  }));

export const staticTicketTabs: StaticTicketTab[] = [
  ...baseTicketTabs,
  ...generatedTicketTabs,
];

export const staticColumns: StaticColumn[] = [
  { key: "customer", label: "Customer" },
  { key: "owner", label: "Owner" },
  { key: "state", label: "State" },
  { key: "priority", label: "Priority" },
  { key: "pendingTill", label: "Pending till" },
  { key: "updatedAt", label: "Updated at" },
];

export const staticTabOrientations: Array<{
  value: StaticTabOrientation;
  label: string;
}> = [
  { value: "horizontal", label: "Horizontal tabs" },
  { value: "vertical", label: "Vertical tabs" },
];
