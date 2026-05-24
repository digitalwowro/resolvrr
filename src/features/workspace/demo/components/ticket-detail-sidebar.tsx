"use client";

import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  PauseCircle,
  Plus,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Button,
  DropdownSelect,
  Tooltip,
  type DropdownOption,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  StaticTicketPriority,
  StaticTicketRow,
  StaticTicketState,
} from "../static-types";

const stateClass: Record<StaticTicketState, string> = {
  New: "text-rose-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: CirclePlus,
  Open: Circle,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

const priorityClass: Record<StaticTicketPriority, string> = {
  Low: "text-emerald-600",
  Medium: "text-indigo-600",
  High: "text-rose-600",
};

const priorityIcon: Record<StaticTicketPriority, LucideIcon> = {
  Low: SignalLow,
  Medium: SignalMedium,
  High: SignalHigh,
};

const groupOptions: DropdownOption[] = [
  { value: "users", label: "Users" },
  { value: "channel", label: "Channel" },
  { value: "direct-sales", label: "Direct Sales" },
];

function iconOption(value: string, Icon: LucideIcon, className: string): DropdownOption {
  return {
    value,
    label: value,
    icon: <Icon aria-hidden="true" className={cn("size-[1em]", className)} />,
  };
}

const stateOptions = ([
  "New",
  "Open",
  "Pending Reminder",
  "Pending Close",
  "Closed",
] satisfies StaticTicketState[]).map((state) =>
  iconOption(state, stateIcon[state], stateClass[state]),
);

const priorityOptions = (["Low", "Medium", "High"] satisfies StaticTicketPriority[]).map(
  (priority) => iconOption(priority, priorityIcon[priority], priorityClass[priority]),
);

function SidebarField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block w-full space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}

export function TicketDetailSidebar({ ticket }: { ticket: StaticTicketRow }) {
  const [state, setState] = useState(ticket.state);
  const [priority, setPriority] = useState(ticket.priority);
  const [group, setGroup] = useState(groupOptions[0].value);
  const [subscribed, setSubscribed] = useState(true);
  const [tags, setTags] = useState("");

  return (
    <aside className="w-56 shrink-0 space-y-4 border-l border-slate-200 px-3 py-3">
      <SidebarField label="State">
        <DropdownSelect
          ariaLabel="Ticket state"
          className="block w-full [&>div]:w-full"
          onValueChange={(value) => setState(value as StaticTicketState)}
          options={stateOptions}
          triggerClassName="w-full"
          value={state}
        />
      </SidebarField>
      <SidebarField label="Priority">
        <DropdownSelect
          ariaLabel="Ticket priority"
          className="block w-full [&>div]:w-full"
          onValueChange={(value) => setPriority(value as StaticTicketPriority)}
          options={priorityOptions}
          triggerClassName="w-full"
          value={priority}
        />
      </SidebarField>
      <SidebarField label="Group">
        <DropdownSelect
          ariaLabel="Ticket group"
          className="block w-full [&>div]:w-full"
          onValueChange={setGroup}
          options={groupOptions}
          triggerClassName="w-full"
          value={group}
        />
      </SidebarField>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">Subscribed</span>
        <button
          aria-label="Subscribed"
          aria-checked={subscribed}
          className={cn(
            "inline-flex h-6 w-11 items-center rounded-full border border-slate-200 px-0.5",
            subscribed ? "justify-end bg-indigo-600" : "justify-start bg-white",
          )}
          onClick={() => setSubscribed((current) => !current)}
          role="switch"
          type="button"
        >
          <span className="size-4 rounded-full bg-white shadow-sm" />
          <span className="sr-only">
            {subscribed ? "Subscribed yes" : "Subscribed no"}
          </span>
        </button>
      </div>
      <SidebarField label="Tags">
        <input
          aria-label="Ticket tags"
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onChange={(event) => setTags(event.target.value)}
          value={tags}
        />
      </SidebarField>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold">Links</span>
          <Tooltip content="Add link">
            <Button
              aria-label="Add link"
              className="!h-auto !gap-0 !p-0.5 justify-center rounded"
              icon={<Plus aria-hidden="true" className="size-[1em]" />}
              onClick={() => undefined}
              type="button"
              variant="ghost"
            />
          </Tooltip>
        </div>
        <p className="text-xs">No links yet</p>
      </div>
    </aside>
  );
}
