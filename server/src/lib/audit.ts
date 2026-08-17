import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

export async function writeAuditLog(params: {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadataJson: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    // Audit logging must never break the request it's observing.
    logger.error({ err }, 'failed to write audit log');
  }
}

export async function writeSecurityEvent(params: {
  userId?: string | null;
  type: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.securityEvent.create({
      data: {
        userId: params.userId ?? null,
        type: params.type,
        severity: params.severity ?? 'INFO',
        metadataJson: params.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    logger.error({ err }, 'failed to write security event');
  }
}
