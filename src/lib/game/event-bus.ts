import { Prisma } from "@prisma/client";

export interface AuditGameEvent {
  gameId: string;
  gamePlayerId?: string | null;
  eventType: string;
  sequenceNumber: number;
  payload: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Authoritatively persists an audit game event to Neon PostgreSQL with a strict sequential number.
 * Advances the game version in the database transaction.
 */
export async function emitGameEvent(
  tx: any,
  params: {
    gameId: string;
    gamePlayerId?: string | null;
    eventType: string;
    payload: Record<string, unknown>;
  }
): Promise<AuditGameEvent> {
  const { gameId, gamePlayerId, eventType, payload } = params;

  // Increment game version atomically in Neon PostgreSQL
  const updatedGame = await tx.game.update({
    where: { id: gameId },
    data: {
      version: { increment: 1 },
    },
    select: { version: true },
  });

  const sequenceNumber = updatedGame.version;

  const eventRecord = await tx.gameEvent.create({
    data: {
      gameId,
      gamePlayerId: gamePlayerId ?? null,
      eventType,
      sequenceNumber,
      payload: payload as Prisma.InputJsonValue,
    },
  });

  return {
    gameId,
    gamePlayerId: eventRecord.gamePlayerId,
    eventType: eventRecord.eventType,
    sequenceNumber: eventRecord.sequenceNumber,
    payload,
    createdAt: eventRecord.createdAt,
  };
}
