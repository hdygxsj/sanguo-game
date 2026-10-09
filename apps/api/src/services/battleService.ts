import type { PrismaClient } from '@prisma/client';
import { runAgent } from '../agents/runner.js';
import { loadPolicy } from '../agents/training.js';
import { chooseLearned } from '../agents/learning.js';
import { generateBattle } from '../domain/generate.js';
import { resolveTurn } from '../domain/resolveTurn.js';
import type { AgentAction, BattleState, DomainEvent } from '../domain/types.js';
import { validateAction } from '../domain/rules.js';
import { battleEventBus } from '../realtime/eventBus.js';
import {expandRoster} from '../domain/rosterExpansion.js';

export interface CreateBattleInput {
  playerAgentId?: string;
  title: string;
  columns: number;
  rows: number;
  agentCount: number;
  maxTurns: number;
}

function parseState(stateJson: string): BattleState {
  return JSON.parse(stateJson) as BattleState;
}

function parseEvent(payloadJson: string): DomainEvent {
  return JSON.parse(payloadJson) as DomainEvent;
}

export class BattleService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(ownerId: string) {
    return this.prisma.battle.findMany({
      where: { ownerId },
      include: { agents: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(ownerId: string, input: CreateBattleInput) {
    const seed = `${input.title}-${Date.now().toString(36)}`;
    const state = generateBattle(seed, input.columns, input.rows, input.agentCount, 0);
    if(input.playerAgentId){
      if(!state.agents.some(agent=>agent.id===input.playerAgentId))throw new Error('INVALID_PLAYER_FACTION');
      state.playerAgentId=input.playerAgentId;
    }
    state.policy = await loadPolicy();
    return this.prisma.battle.create({
      data: {
        title: input.title,
        seed,
        status: state.status,
        currentTurn: state.turn,
        maxTurns: 0,
        columns: input.columns,
        rows: input.rows,
        version: state.version,
        ownerId,
        agents: {
          create: state.agents.map((agent) => ({
            agentKey: agent.id,
            name: agent.name,
            color: agent.color,
            strategy: agent.strategy,
            active: agent.active,
          })),
        },
        turns: { create: { number: 0, stateJson: JSON.stringify(state) } },
      },
      include: { agents: true },
    });
  }

  async get(ownerId: string, battleId: string) {
    const battle = await this.prisma.battle.findFirst({
      where: { id: battleId, ownerId },
      include: { agents: true, turns: { orderBy: { number: 'desc' }, take: 1 } },
    });
    if (!battle) throw new Error('BATTLE_NOT_FOUND');
    const {turns,...detail}=battle;
    const state=parseState(turns[0]!.stateJson);
    if(state.status==='active')expandRoster(state);
    return { ...detail, state };
  }

  async executeTurn(ownerId: string, battleId: string, expectedVersion: number, order?:AgentAction) {
    const current = await this.get(ownerId, battleId);
    if (current.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
    if(order) {
      if(current.state.playerAgentId && order.agentId!==current.state.playerAgentId) throw new Error('INVALID_PLAYER_FACTION');
      const validation=validateAction(current.state,order.agentId,order.action);
      if(!validation.ok) throw new Error(`INVALID_COMMAND_${validation.code}`);
    }
    const player=order?.agentId??current.state.playerAgentId;
    // Local parsed copy only: first-turn offers must already respect player consent.
    if(player)current.state.playerAgentId=player;

    const decisions = await Promise.all(
      current.state.agents
        .filter((agent) => agent.active)
        .map(async (agent) => agent.id===player ? {agentId:agent.id,action:order?.action??{type:'hold' as const}} : ({ agentId: agent.id, ...(await runAgent(current.state, agent,
          current.state.policy ? (state, candidate) => chooseLearned(state, candidate, state.policy!) : undefined)) })),
    );
    const result = resolveTurn(
      current.state,
      decisions.map((decision) => ({ agentId: decision.agentId, action: decision.action })),
      expectedVersion,
    );
    if(player) result.state.playerAgentId=player;

    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.battle.updateMany({
        where: { id: battleId, ownerId, version: expectedVersion },
        data: {
          version: result.state.version,
          currentTurn: result.state.turn,
          status: result.state.status,
        },
      });
      if (updated.count !== 1) throw new Error('VERSION_CONFLICT');
      await transaction.turn.create({
        data: { battleId, number: result.state.turn, stateJson: JSON.stringify(result.state) },
      });
      if (result.events.length) {
        await transaction.event.createMany({
          data: result.events.map((event) => ({
            battleId,
            turnNumber: event.turn,
            sequence: event.sequence,
            type: event.type,
            payloadJson: JSON.stringify(event),
          })),
        });
      }
      for (const agent of result.state.agents) {
        await transaction.agent.updateMany({
          where: { battleId, agentKey: agent.id },
          data: { active: agent.active },
        });
      }
    });

    battleEventBus.publish(battleId, result.events);

    return result;
  }

  async replay(ownerId: string, battleId: string, turn: number) {
    const battle = await this.prisma.battle.findFirst({ where: { id: battleId, ownerId } });
    if (!battle) throw new Error('BATTLE_NOT_FOUND');
    const [snapshot, records] = await Promise.all([
      this.prisma.turn.findUnique({ where: { battleId_number: { battleId, number: turn } } }),
      this.prisma.event.findMany({ where: { battleId, turnNumber: turn }, orderBy: { sequence: 'asc' } }),
    ]);
    if (!snapshot) throw new Error('TURN_NOT_FOUND');
    return { snapshot: parseState(snapshot.stateJson), events: records.map((record) => parseEvent(record.payloadJson)) };
  }
}
