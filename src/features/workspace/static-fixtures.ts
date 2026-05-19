import type {
  StaticColumn,
  StaticProfileAction,
  StaticProfileWorkspace,
  StaticSavedView,
  StaticStateVariant,
  StaticTabOrientation,
  StaticTicketRow,
  StaticTicketTab,
} from "./static-types";

// Static workspace fixtures are feature-local review data, not app domain data.
export const staticSavedViews: StaticSavedView[] = [
  { id: "urgent", label: "Urgent open" },
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "waiting", label: "Waiting on customer" },
];

export const staticProfileWorkspaces: StaticProfileWorkspace[] = [
  { id: "northwind", label: "Northwind Support" },
  { id: "contoso", label: "Contoso Care" },
  { id: "fabrikam", label: "Fabrikam Desk" },
];

export const staticProfileActions: StaticProfileAction[] = [
  { id: "preferences", label: "Preferences" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "manage-workspaces", label: "Manage workspaces" },
];

export const staticTicketTabs: StaticTicketTab[] = [
  { id: "48291", label: "#48291 Billing follow-up", unread: true },
  { id: "48288", label: "#48288 Login loop", dirty: true },
  { id: "48271", label: "#48271 Plan change" },
  { id: "48255", label: "#48255 Invoice copy", loading: true },
];

export const staticTicketRows: StaticTicketRow[] = [
  {
    id: "48291",
    ticketNumber: "#48291",
    subject: "Billing follow-up for annual renewal",
    requester: "Maya Patel",
    workspace: "Northwind Support",
    state: "open",
    priority: "urgent",
    assignee: "R. Rosca",
    updated: "4m ago",
    sla: "18m",
    preview: "Customer replied with purchase order details and asks for confirmation.",
  },
  {
    id: "48288",
    ticketNumber: "#48288",
    subject: "Login loop after password reset",
    requester: "Daniel Cho",
    workspace: "Contoso Care",
    state: "pending",
    priority: "high",
    assignee: "N. Ionescu",
    updated: "12m ago",
    sla: "42m",
    preview: "Session appears to restart after MFA challenge on Chrome.",
  },
  {
    id: "48284",
    ticketNumber: "#48284",
    subject: "Need VAT details added to receipt",
    requester: "Sofia Martin",
    workspace: "Northwind Support",
    state: "open",
    priority: "normal",
    assignee: "Unassigned",
    updated: "19m ago",
    sla: "1h 12m",
    preview: "Requester needs updated billing profile before accounting close.",
  },
  {
    id: "48277",
    ticketNumber: "#48277",
    subject: "Webhook delivery failed overnight",
    requester: "Owen Brooks",
    workspace: "Fabrikam Desk",
    state: "escalated",
    priority: "urgent",
    assignee: "A. Pop",
    updated: "26m ago",
    sla: "9m",
    preview: "Several webhook attempts returned 503 during a customer deployment.",
  },
  {
    id: "48271",
    ticketNumber: "#48271",
    subject: "Plan change for regional team",
    requester: "Elena Vasquez",
    workspace: "Contoso Care",
    state: "pending",
    priority: "normal",
    assignee: "R. Rosca",
    updated: "31m ago",
    sla: "2h",
    preview: "Sales-approved plan change is waiting for customer billing contact.",
  },
  {
    id: "48268",
    ticketNumber: "#48268",
    subject: "Export contains duplicate rows",
    requester: "Kenji Mori",
    workspace: "Northwind Support",
    state: "open",
    priority: "high",
    assignee: "M. Stan",
    updated: "44m ago",
    sla: "53m",
    preview: "CSV export duplicates rows when date range crosses a month boundary.",
  },
  {
    id: "48260",
    ticketNumber: "#48260",
    subject: "Close old onboarding request",
    requester: "Priya Shah",
    workspace: "Fabrikam Desk",
    state: "resolved",
    priority: "low",
    assignee: "N. Ionescu",
    updated: "1h ago",
    sla: "Done",
    preview: "Requester confirmed the onboarding checklist is complete.",
  },
];

export const staticColumns: StaticColumn[] = [
  { key: "requester", label: "Requester" },
  { key: "workspace", label: "Workspace" },
  { key: "state", label: "State" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
  { key: "updated", label: "Updated" },
  { key: "sla", label: "SLA" },
];

export const staticStateVariants: StaticStateVariant[] = [
  {
    id: "ready",
    label: "Rows",
    title: "Ticket rows",
    detail: "Synthetic rows render the dense workspace table.",
  },
  {
    id: "loading",
    label: "Loading",
    title: "Loading tickets",
    detail: "The workspace can reserve table space while rows are loading.",
  },
  {
    id: "empty",
    label: "Empty",
    title: "No tickets in this view",
    detail: "The selected synthetic view has no matching ticket rows.",
  },
  {
    id: "error",
    label: "Error",
    title: "Ticket list unavailable",
    detail: "A static error state can be displayed without external service details.",
  },
  {
    id: "disconnected",
    label: "Disconnected",
    title: "No workspace connected",
    detail: "The UI can show a disconnected state before helpdesk wiring exists.",
  },
];

export const staticTabOrientations: Array<{
  value: StaticTabOrientation;
  label: string;
}> = [
  { value: "horizontal", label: "Horizontal tabs" },
  { value: "vertical", label: "Vertical tabs" },
];
