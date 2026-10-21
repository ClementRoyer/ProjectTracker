import * as contract from '@project-tracker/contract';
import type { Operation } from '@project-tracker/contract';
import type { Result } from '@project-tracker/core/domain';
import * as usecases from '@project-tracker/core/usecases';
import type { UsecaseContext, UsecaseError } from '@project-tracker/core/usecases';
import type { z } from 'zod';

/** An operation of the catalogue and the use case that carries it out. */
export interface Binding {
  operation: Operation<z.ZodType, z.ZodType>;
  run: (
    ctx: UsecaseContext,
    input: unknown,
  ) => Result<unknown, UsecaseError> | Promise<Result<unknown, UsecaseError>>;
}

function bind<Input extends z.ZodType, Output extends z.ZodType>(
  operation: Operation<Input, Output>,
  run: (
    ctx: UsecaseContext,
    input: z.infer<Input>,
  ) => Result<z.infer<Output>, UsecaseError> | Promise<Result<z.infer<Output>, UsecaseError>>,
): Binding {
  return { operation, run: (ctx, input) => run(ctx, operation.input.parse(input)) };
}

/** Every operation the server offers (ADR 0026): the HTTP routes, MCP tools and CLI commands come from it. */
export const CATALOG: readonly Binding[] = [
  bind(contract.createTicket, usecases.createTicket),
  bind(contract.listTickets, usecases.listTickets),
  bind(contract.getTicket, usecases.getTicket),
  bind(contract.reportProgress, usecases.reportProgress),
  bind(contract.changePhase, usecases.changePhase),
  bind(contract.closeTicket, usecases.closeTicket),
  bind(contract.declareWait, usecases.declareWait),
  bind(contract.recordEntry, usecases.recordEntry),
  bind(contract.recordTestRun, usecases.recordTestRun),
  bind(contract.listNovelties, usecases.listNovelties),
  bind(contract.markVisited, usecases.markVisited),
  bind(contract.setPriority, usecases.setPriority),
  bind(contract.setDueDate, usecases.setDueDate),
  bind(contract.setSize, usecases.setSize),
  bind(contract.setGroup, usecases.setGroup),
  bind(contract.setWorktree, usecases.setWorktree),
  bind(contract.forgetWorktree, usecases.forgetWorktree),
  bind(contract.listWorktrees, usecases.listWorktrees),
  bind(contract.recordPreview, usecases.recordPreview),
  bind(contract.getPreview, usecases.getPreview),
  bind(contract.suggestNext, usecases.suggestNext),
  bind(contract.acquireResource, usecases.acquireResource),
  bind(contract.renewResource, usecases.renewResource),
  bind(contract.releaseResource, usecases.releaseResource),
  bind(contract.markTicketRead, usecases.markTicketRead),
  bind(contract.listWaitingForMe, usecases.listWaitingForMe),
  bind(contract.deliverBatch, usecases.deliverBatch),
  bind(contract.validateBatch, usecases.validateBatch),
  bind(contract.listBatches, usecases.listBatches),
  bind(contract.proposeChangelog, usecases.proposeChangelog),
  bind(contract.acceptChangelog, usecases.acceptChangelog),
  bind(contract.reportChangedFiles, usecases.reportChangedFiles),
  bind(contract.loadFromJira, usecases.loadFromJira),
  bind(contract.previewJiraLoad, usecases.previewJiraLoad),
  bind(contract.listDocuments, usecases.listDocuments),
  bind(contract.readDocument, usecases.readDocument),
  bind(contract.introduce, usecases.introduce),
  bind(contract.takeTicket, usecases.takeTicket),
  bind(contract.askQuestion, usecases.askQuestion),
  bind(contract.answerQuestion, usecases.answerQuestion),
  bind(contract.sendMessage, usecases.sendMessage),
  bind(contract.listInbox, usecases.listInbox),
  bind(contract.acknowledge, usecases.acknowledge),
  bind(contract.submitReply, usecases.submitReply),
  bind(contract.reportWorking, usecases.reportWorking),
  bind(contract.requestBackend, usecases.requestBackend),
  bind(contract.launcherHeartbeat, usecases.launcherHeartbeat),
  bind(contract.takeBackendRequest, usecases.takeBackendRequest),
  bind(contract.finishExecution, usecases.finishExecution),
  bind(contract.recordUsage, usecases.recordUsage),
  bind(contract.usageSummary, usecases.usageSummary),
];

export function findBinding(name: string): Binding | undefined {
  return CATALOG.find((binding) => binding.operation.name === name);
}
