import type { ClientStatus, InvoiceStatus, Priority, ProjectStatus, TaskStatus } from "@/db/schema";
import { CLIENT_STATUS, INVOICE_STATUS, PRIORITY, PROJECT_STATUS, TASK_STATUS } from "@/lib/constants";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Kind =
  | { kind: "client"; status: ClientStatus }
  | { kind: "project"; status: ProjectStatus }
  | { kind: "task"; status: TaskStatus }
  | { kind: "invoice"; status: InvoiceStatus }
  | { kind: "priority"; status: Priority };

export function StatusBadge({ className, dot = true, ...props }: Kind & { className?: string; dot?: boolean }) {
  const meta =
    props.kind === "client"
      ? CLIENT_STATUS[props.status]
      : props.kind === "project"
        ? PROJECT_STATUS[props.status]
        : props.kind === "task"
          ? TASK_STATUS[props.status]
          : props.kind === "invoice"
            ? INVOICE_STATUS[props.status]
            : PRIORITY[props.status];
  return (
    <Badge tone={meta.tone} className={cn("capitalize", className)}>
      {dot ? <span className={cn("size-1.5 rounded-full", meta.dot)} /> : null}
      {meta.label}
    </Badge>
  );
}
