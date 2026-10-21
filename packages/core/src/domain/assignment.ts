import { fail, ok, type Result } from './result';

export type Role = 'front' | 'backend';

export type Assignee = { kind: 'developer' } | { kind: 'agent'; agentId: string };

export interface ActiveAssignment {
  ticketId: string;
  role: Role;
  assignee: Assignee;
}

export interface AssignmentError {
  code: 'roleTaken';
  holder: Assignee;
}

/** A ticket has at most one assignee per role (ADR 0010). */
export function assign(
  active: readonly ActiveAssignment[],
  wanted: ActiveAssignment,
): Result<ActiveAssignment, AssignmentError> {
  const current = active.find(
    (assignment) => assignment.ticketId === wanted.ticketId && assignment.role === wanted.role,
  );
  if (current && !sameAssignee(current.assignee, wanted.assignee)) {
    return fail({ code: 'roleTaken', holder: current.assignee });
  }
  return ok(wanted);
}

function sameAssignee(a: Assignee, b: Assignee): boolean {
  if (a.kind === 'developer' || b.kind === 'developer') return a.kind === b.kind;
  return a.agentId === b.agentId;
}
