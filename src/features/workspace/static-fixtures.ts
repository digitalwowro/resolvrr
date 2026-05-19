import type {
  StaticColumn,
  StaticProfileAction,
  StaticProfileWorkspace,
  StaticSavedView,
  StaticTabOrientation,
  StaticTicketRow,
  StaticTicketTab,
} from "./static-types";

// Static workspace fixtures are feature-local review data, not app domain data.
export const staticSavedViews: StaticSavedView[] = [
  { id: "open", label: "Open tickets" },
  { id: "mine", label: "Owned by me" },
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
  { id: "manage-workspaces", label: "Manage workspaces" },
];

export const staticTicketTabs: StaticTicketTab[] = [
  { id: "48291", label: "#48291", unread: true },
  { id: "48288", label: "#48288", dirty: true },
  { id: "48277", label: "#48277" },
  { id: "48271", label: "#48271" },
  { id: "48255", label: "#48255", loading: true },
];

export const staticTicketRows: StaticTicketRow[] = [
  {
    id: "48291",
    number: "#48291",
    title: "Billing follow-up for annual renewal",
    customer: "Maya Patel",
    owner: "R. Rosca",
    state: "Open",
    priority: "High",
    pendingTill: "Today 15:40",
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
    updatedAt: "1h ago",
    preview: "Customer confirmed the onboarding checklist is complete.",
  },
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
