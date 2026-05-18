export * from "@/lib/auth/permissions";

import {
  hasAnyPermission,
  hasPermission,
  type AccessSubject,
} from "@/lib/auth/permissions";

export function canManageRooms(subject: AccessSubject): boolean {
  return hasPermission(subject, "ROOMS_CREATE") || hasPermission(subject, "ROOMS_UPDATE");
}

export function canViewRooms(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["ACCESS_ROOMS", "ROOMS_READ"]);
}

export function canChangeRoomStatus(subject: AccessSubject): boolean {
  return hasPermission(subject, "ROOMS_CHANGE_STATUS");
}

export function canManageRoomTypes(subject: AccessSubject): boolean {
  return hasPermission(subject, "ROOM_TYPES_MANAGE");
}

export function canViewRoomTypes(subject: AccessSubject): boolean {
  return canViewRooms(subject);
}

export function canManageGuests(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["GUESTS_CREATE", "GUESTS_UPDATE"]);
}

export function canViewGuests(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["ACCESS_GUESTS", "GUESTS_READ"]);
}

export function canManageReservations(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["RESERVATIONS_CREATE", "RESERVATIONS_UPDATE"]);
}

export function canViewReservations(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["ACCESS_RESERVATIONS", "RESERVATIONS_READ"]);
}

export function canCancelReservation(subject: AccessSubject): boolean {
  return hasPermission(subject, "RESERVATIONS_CANCEL");
}

export function canCheckInOut(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["RESERVATIONS_CHECKIN", "RESERVATIONS_CHECKOUT"]);
}

export function canCloseReservation(subject: AccessSubject): boolean {
  return hasPermission(subject, "FINANCIAL_CREATE_CLOSING");
}

export function canReopenClosing(subject: AccessSubject): boolean {
  return hasPermission(subject, "FINANCIAL_REOPEN_CLOSING");
}

export function canEditPaymentStatus(subject: AccessSubject): boolean {
  return hasPermission(subject, "FINANCIAL_UPDATE_PAYMENT_STATUS");
}

export function canViewFinancial(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["ACCESS_FINANCIAL", "FINANCIAL_READ"]);
}

export function canViewDashboard(subject: AccessSubject): boolean {
  return hasPermission(subject, "ACCESS_DASHBOARD");
}

export function canViewDashboardFinancial(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["FINANCIAL_READ", "REPORTS_READ_FINANCIAL"]);
}

export function canViewDashboardKitchen(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["KITCHEN_READ", "REPORTS_READ_KITCHEN", "STOCK_VIEW_LOW_STOCK"]);
}

export function canViewReports(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, [
    "ACCESS_REPORTS",
    "REPORTS_READ_OPERATIONAL",
    "REPORTS_READ_KITCHEN",
    "REPORTS_READ_FINANCIAL",
  ]);
}

export function canViewReportsFinancial(subject: AccessSubject): boolean {
  return hasPermission(subject, "REPORTS_READ_FINANCIAL");
}

export function canViewReportsKitchen(subject: AccessSubject): boolean {
  return hasPermission(subject, "REPORTS_READ_KITCHEN");
}

export function canManageProducts(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["STOCK_CREATE_PRODUCT", "STOCK_UPDATE_PRODUCT"]);
}

export function canViewProducts(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["ACCESS_STOCK", "STOCK_READ"]);
}

export function canManageProductCategories(subject: AccessSubject): boolean {
  return canManageProducts(subject);
}

export function canRegisterPurchase(subject: AccessSubject): boolean {
  return hasPermission(subject, "STOCK_CREATE_ENTRY");
}

export function canRegisterWaste(subject: AccessSubject): boolean {
  return hasPermission(subject, "KITCHEN_CREATE_WASTE");
}

export function canRegisterInternalConsumption(subject: AccessSubject): boolean {
  return hasPermission(subject, "KITCHEN_CREATE_INTERNAL_CONSUMPTION");
}

export function canAdjustStock(subject: AccessSubject): boolean {
  return hasPermission(subject, "STOCK_CREATE_ADJUSTMENT");
}

export function canRegisterReservationConsumption(subject: AccessSubject): boolean {
  return hasPermission(subject, "KITCHEN_CREATE_CONSUMPTION");
}

export function canDeleteReservationConsumption(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["KITCHEN_CREATE_CONSUMPTION", "FINANCIAL_CREATE_CLOSING"]);
}

export function canSeeFinancialValues(subject: AccessSubject): boolean {
  return hasAnyPermission(subject, ["FINANCIAL_READ", "STOCK_VIEW_COSTS", "REPORTS_READ_FINANCIAL"]);
}
