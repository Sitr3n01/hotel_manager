"use client";
import { enqueue } from "./queue";
import { pingServer } from "./connectivity";
import {
  createInternalConsumption,
  createPurchase,
  createWaste,
} from "@/lib/actions/stock-movement";
import { createReservationConsumption } from "@/lib/actions/reservation-consumption";
import type { OperationType } from "@/lib/sync/types";
import type {
  InternalConsumptionInput,
  PurchaseInput,
  WasteInput,
} from "@/lib/validations/stock-movement";
import type { CreateConsumptionInput } from "@/lib/validations/reservation-consumption";
import type { PreReservationPayload } from "@/lib/validations/sync-operation";

export type OfflineAwareResult =
  | { success: true; queued?: boolean }
  | { success: false; error: string };

async function isOnline(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  return pingServer();
}

function fireEnqueued(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sync:enqueued"));
  }
}

async function enqueueAndNotify(
  operationType: OperationType,
  payload: unknown,
  userId: string,
): Promise<OfflineAwareResult> {
  await enqueue({ operationType, payload, createdByUserId: userId });
  fireEnqueued();
  return { success: true, queued: true };
}

async function createOrQueue(
  operationType: OperationType,
  payload: unknown,
  userId: string,
  onlineAction: () => Promise<OfflineAwareResult>,
): Promise<OfflineAwareResult> {
  if (!(await isOnline())) return enqueueAndNotify(operationType, payload, userId);
  try {
    return await onlineAction();
  } catch (error) {
    if (await isOnline()) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Nao foi possivel concluir a operacao.",
      };
    }
    return enqueueAndNotify(operationType, payload, userId);
  }
}

export async function enqueueOrCreateWaste(
  input: WasteInput,
  userId: string,
): Promise<OfflineAwareResult> {
  return createOrQueue("WASTE_CREATE", input, userId, async () => {
    const result = await createWaste(input);
    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

export async function enqueueOrCreateInternalConsumption(
  input: InternalConsumptionInput,
  userId: string,
): Promise<OfflineAwareResult> {
  return createOrQueue("INTERNAL_CONSUMPTION_CREATE", input, userId, async () => {
    const result = await createInternalConsumption(input);
    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

export async function enqueueOrCreatePurchase(
  input: PurchaseInput,
  userId: string,
): Promise<OfflineAwareResult> {
  return createOrQueue("STOCK_PURCHASE_CREATE", input, userId, async () => {
    const result = await createPurchase(input);
    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

export async function enqueueOrCreateReservationConsumption(
  input: CreateConsumptionInput,
  userId: string,
): Promise<OfflineAwareResult> {
  return createOrQueue("RESERVATION_CONSUMPTION_CREATE", input, userId, async () => {
    const result = await createReservationConsumption(input);
    return result.success ? { success: true } : { success: false, error: result.error };
  });
}

export async function enqueuePreReservation(
  payload: PreReservationPayload,
  userId: string,
): Promise<OfflineAwareResult> {
  // Pre-reservation goes through the queue unconditionally: validating
  // overlap requires server access. Online callers will sync in seconds.
  return enqueueAndNotify("PRE_RESERVATION_CREATE", payload, userId);
}
