import type {
  Guest,
  Product,
  ProductCategory,
  Reservation,
  Role,
  Room,
  RoomType,
  StockMovement,
} from "@prisma/client";

type DecimalLike = { toString: () => string };

export type ProductForClient = Omit<
  Product,
  "averageCost" | "currentStock" | "minimumStock" | "salePrice"
> & {
  averageCost: string;
  currentStock: string;
  minimumStock: string;
  salePrice: string | null;
  category: ProductCategory;
};

export type MovementForClient = Omit<StockMovement, "estimatedCost" | "quantity"> & {
  estimatedCost: string;
  quantity: string;
  product: { id: string; name: string; unit: string; category: { name: string } };
  createdBy: { id: string; name: string; role: Role } | null;
  reservation: { id: string; guest: { name: string } } | null;
};

type ProductWithCategory = Product & { category: ProductCategory };

export type RoomTypeForClient = Omit<RoomType, "basePrice"> & {
  basePrice: string;
};

export type RoomTypeWithCountForClient = RoomTypeForClient & {
  _count: { rooms: number };
};

export type RoomWithTypeForClient = Room & {
  roomType: RoomTypeForClient;
};

export type ReservationWithRelationsForClient = Omit<
  Reservation,
  "dailyRate" | "discountAmount"
> & {
  dailyRate: string;
  discountAmount: string;
  guest: Guest;
  room: RoomWithTypeForClient;
};

type MovementWithRelations = StockMovement & {
  product: ProductWithCategory;
  createdBy: { id: string; name: string; role: Role } | null;
  reservation: { id: string; guest: { name: string } } | null;
};

export type ConsumptionForClient = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  createdAt: Date;
  product: { id: string; name: string; unit: string; category: { name: string } } | null;
  createdBy: { id: string; name: string } | null;
};

type ConsumptionWithRelations = {
  id: string;
  description: string;
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  totalPrice: DecimalLike;
  createdAt: Date;
  product: { id: string; name: string; unit: string; category: { name: string } } | null;
  createdBy: { id: string; name: string } | null;
};

export function serializeProductForClient(product: ProductWithCategory): ProductForClient {
  return {
    ...product,
    averageCost: product.averageCost.toString(),
    currentStock: product.currentStock.toString(),
    minimumStock: product.minimumStock.toString(),
    salePrice: product.salePrice?.toString() ?? null,
  };
}

export function serializeRoomTypeForClient(roomType: RoomType): RoomTypeForClient {
  return {
    ...roomType,
    basePrice: roomType.basePrice.toString(),
  };
}

export function serializeRoomTypeWithCountForClient(
  roomType: RoomType & { _count: { rooms: number } },
): RoomTypeWithCountForClient {
  return {
    ...serializeRoomTypeForClient(roomType),
    _count: roomType._count,
  };
}

export function serializeRoomWithTypeForClient(
  room: Room & { roomType: RoomType },
): RoomWithTypeForClient {
  return {
    ...room,
    roomType: serializeRoomTypeForClient(room.roomType),
  };
}

export function serializeReservationWithRelationsForClient(
  reservation: Reservation & { guest: Guest; room: Room & { roomType: RoomType } },
): ReservationWithRelationsForClient {
  return {
    ...reservation,
    dailyRate: reservation.dailyRate.toString(),
    discountAmount: reservation.discountAmount.toString(),
    room: serializeRoomWithTypeForClient(reservation.room),
  };
}

export function serializeMovementForClient(movement: MovementWithRelations): MovementForClient {
  return {
    ...movement,
    estimatedCost: movement.estimatedCost.toString(),
    quantity: movement.quantity.toString(),
    product: {
      id: movement.product.id,
      name: movement.product.name,
      unit: movement.product.unit,
      category: { name: movement.product.category.name },
    },
  };
}

export function serializeConsumptionForClient(
  consumption: ConsumptionWithRelations,
): ConsumptionForClient {
  return {
    ...consumption,
    quantity: consumption.quantity.toString(),
    unitPrice: consumption.unitPrice.toString(),
    totalPrice: consumption.totalPrice.toString(),
  };
}
