import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export type ClosingSummary = {
  pendingTotal: number;
  partialTotal: number;
  paidTotal: number;
  grandTotal: number;
};

export type FinancialClosingListItem = {
  id: string;
  reservationId: string;
  guestName: string;
  roomName: string;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  dailyTotal: number;
  consumptionTotal: number;
  discountTotal: number;
  extraTotal: number;
  finalTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  closedAt: Date | null;
};

export type PendingClosingReservation = {
  id: string;
  guestName: string;
  roomName: string;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  status: string;
  estimatedTotal: number;
};

export type FinancialClosingDetail = FinancialClosingListItem & {
  closingId: string | null;
  nights: number;
  dailyRate: number;
  discountJustification: string | null;
  extraJustification: string | null;
  closedByName: string | null;
  consumptions: {
    id: string;
    productName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    createdAt: Date;
  }[];
};
