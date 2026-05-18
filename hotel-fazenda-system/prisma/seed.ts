/**
 * Seed script — creates the initial admin user and sample reference data.
 *
 * Prerequisites:
 *   - `npm run db:migrate` has been run
 *   - `prisma/manual/01_user_profile_trigger.sql` has been applied
 *     in the Supabase SQL Editor (see docs/SETUP.md)
 *   - `.env.local` has SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Run: `npm run db:seed`
 */
import { PrismaClient, Role, Unit, MovementType } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  PERMISSION_PRESETS,
  PERMISSION_TAGS,
  type PermissionKey,
} from "../lib/auth/permissions";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

type RoomTypeSeed = {
  name: string;
  description: string;
  baseCapacity: number;
  maxCapacity: number;
  basePrice: number;
};

type RoomSeed = {
  name: string;
  number: string;
  roomTypeName: string;
};

const roomTypeSeeds: RoomTypeSeed[] = [
  {
    name: "Standard",
    description: "Quarto padrão para casal",
    baseCapacity: 2,
    maxCapacity: 3,
    basePrice: 280,
  },
  {
    name: "Família",
    description: "Quarto amplo para famílias",
    baseCapacity: 4,
    maxCapacity: 6,
    basePrice: 460,
  },
  {
    name: "Suíte Master",
    description: "Suíte luxo com vista panorâmica",
    baseCapacity: 2,
    maxCapacity: 4,
    basePrice: 650,
  },
  {
    name: "Econômico",
    description: "Quarto compacto para viajantes solo",
    baseCapacity: 1,
    maxCapacity: 2,
    basePrice: 160,
  },
];

const roomSeeds: RoomSeed[] = [
  { name: "Casa do Lago", number: "101", roomTypeName: "Standard" },
  { name: "Casa do Bosque", number: "102", roomTypeName: "Standard" },
  { name: "Casa do Ipê", number: "103", roomTypeName: "Standard" },
  { name: "Casa da Figueira", number: "104", roomTypeName: "Standard" },
  { name: "Chalé Família", number: "201", roomTypeName: "Família" },
  { name: "Chalé Harmonia", number: "202", roomTypeName: "Família" },
  { name: "Suíte Panorama", number: "301", roomTypeName: "Suíte Master" },
  { name: "Suíte Horizonte", number: "302", roomTypeName: "Suíte Master" },
  { name: "Quarto Simples A", number: "401", roomTypeName: "Econômico" },
  { name: "Quarto Simples B", number: "402", roomTypeName: "Econômico" },
];

async function seedAdmin(): Promise<string | null> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!email || !password || !supabaseUrl || !serviceRoleKey) {
    console.log(
      "[seed] Skipping admin creation — set ADMIN_EMAIL, ADMIN_PASSWORD, " +
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
    );
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authUser = await ensureAdminAuthUser(supabase, email, password);
  const adminId = await syncAdminProfile(authUser, email);
  await grantPermissions(adminId, PERMISSION_PRESETS.ADMIN, adminId);
  console.log(`[seed] Synced admin ${email} in Supabase Auth and UserProfile.`);
  return adminId;
}

async function ensureAdminAuthUser(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<User> {
  const existingUser = await findAuthUserByEmail(supabase, email);
  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existingUser.user_metadata, name: "Administrador" },
    });
    if (error || !data.user) {
      throw new Error(`[seed] Failed to update auth user: ${error?.message ?? "unknown error"}`);
    }
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Administrador" },
  });

  if (error || !data.user) {
    throw new Error(`[seed] Failed to create auth user: ${error?.message ?? "unknown error"}`);
  }

  return data.user;
}

async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<User | null> {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`[seed] Failed to list auth users: ${error.message}`);

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  throw new Error("[seed] Could not find admin user after scanning 10,000 auth users.");
}

async function syncAdminProfile(authUser: User, email: string): Promise<string> {
  const data = {
    authUserId: authUser.id,
    email,
    name: "Administrador",
    role: Role.ADMIN,
    status: "APPROVED" as const,
    isActive: true,
    approvedAt: new Date(),
  };
  const existing = await prisma.userProfile.findUnique({ where: { email } });
  if (existing) {
    const user = await prisma.userProfile.update({ where: { id: existing.id }, data });
    return user.id;
  }

  const user = await prisma.userProfile.upsert({
    where: { authUserId: authUser.id },
    update: data,
    create: data,
  });
  return user.id;
}

async function seedPermissionCatalog(): Promise<void> {
  for (const permission of PERMISSION_TAGS) {
    await prisma.permissionTag.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
        category: permission.category,
        isSystem: true,
        isActive: true,
      },
      create: {
        key: permission.key,
        name: permission.name,
        description: permission.description,
        category: permission.category,
        isSystem: true,
        isActive: true,
      },
    });
  }
  console.log(`[seed] Ensured ${PERMISSION_TAGS.length} permission tags.`);
}

async function backfillApprovedUserPermissions(adminId: string | null): Promise<void> {
  const users = await prisma.userProfile.findMany({
    where: { status: "APPROVED", isActive: true },
    include: { permissionTags: { where: { isActive: true } } },
  });

  for (const user of users) {
    if (user.permissionTags.length > 0) continue;
    await grantPermissions(user.id, PERMISSION_PRESETS[user.role], adminId ?? user.id);
  }
}

async function grantPermissions(
  userId: string,
  permissions: readonly PermissionKey[],
  grantedById: string,
): Promise<void> {
  const tags = await prisma.permissionTag.findMany({
    where: { key: { in: [...permissions] } },
    select: { id: true, key: true },
  });

  for (const tag of tags) {
    await prisma.userPermissionTag.upsert({
      where: {
        userProfileId_permissionTagId: {
          userProfileId: userId,
          permissionTagId: tag.id,
        },
      },
      update: {
        isActive: true,
        grantedById,
        grantedAt: new Date(),
        revokedAt: null,
        revokedById: null,
      },
      create: {
        userProfileId: userId,
        permissionTagId: tag.id,
        grantedById,
      },
    });
  }
}

async function seedRoomCatalog(): Promise<void> {
  const roomTypesByName = new Map<string, { id: string }>();

  for (const roomTypeSeed of roomTypeSeeds) {
    const roomType = await prisma.roomType.upsert({
      where: { name: roomTypeSeed.name },
      update: {
        description: roomTypeSeed.description,
        baseCapacity: roomTypeSeed.baseCapacity,
        maxCapacity: roomTypeSeed.maxCapacity,
        basePrice: roomTypeSeed.basePrice,
      },
      create: roomTypeSeed,
      select: { id: true, name: true },
    });

    roomTypesByName.set(roomType.name, { id: roomType.id });
  }

  for (const roomSeed of roomSeeds) {
    const roomType = roomTypesByName.get(roomSeed.roomTypeName);
    if (!roomType) {
      throw new Error(`[seed] Missing room type for room ${roomSeed.number}.`);
    }

    await prisma.room.upsert({
      where: { number: roomSeed.number },
      update: {
        name: roomSeed.name,
        roomTypeId: roomType.id,
      },
      create: {
        name: roomSeed.name,
        number: roomSeed.number,
        roomTypeId: roomType.id,
      },
    });
  }
}

async function seedSampleData(): Promise<void> {
  const categoryCount = await prisma.productCategory.count();
  if (categoryCount > 0) {
    await seedRoomCatalog();
    console.log("[seed] Inventory data already present. Ensured 4 room types and 10 rooms.");
    return;
  }

  const [bebidas, secos] = await Promise.all([
    prisma.productCategory.create({ data: { name: "Bebidas" } }),
    prisma.productCategory.create({ data: { name: "Secos" } }),
  ]);

  await prisma.product.createMany({
    data: [
      { name: "Água mineral 500ml", categoryId: bebidas.id, unit: Unit.UNIT, averageCost: 2.0, salePrice: 5.0, minimumStock: 24 },
      { name: "Refrigerante lata", categoryId: bebidas.id, unit: Unit.UNIT, averageCost: 4.5, salePrice: 8.0, minimumStock: 12 },
      { name: "Arroz tipo 1", categoryId: secos.id, unit: Unit.KG, averageCost: 7.0, minimumStock: 5 },
      { name: "Feijão preto", categoryId: secos.id, unit: Unit.KG, averageCost: 8.5, minimumStock: 5 },
      { name: "Açúcar refinado", categoryId: secos.id, unit: Unit.KG, averageCost: 5.0, minimumStock: 3 },
    ],
  });

  await seedRoomCatalog();
  await seedGuestsAndReservations();
  await seedInitialStock();

  console.log("[seed] Created 2 categories, 5 products, 4 room types, 10 rooms.");
}

async function seedInitialStock(): Promise<void> {
  const movementCount = await prisma.stockMovement.count();
  if (movementCount > 0) return;

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  const startingStock: Record<string, number> = {
    "Água mineral 500ml": 48,
    "Refrigerante lata": 36,
    "Arroz tipo 1": 25,
    "Feijão preto": 15,
    "Açúcar refinado": 10,
  };

  for (const p of products) {
    const qty = startingStock[p.name];
    if (!qty) continue;
    await prisma.stockMovement.create({
      data: {
        productId: p.id,
        type: MovementType.IN,
        quantity: qty,
        estimatedCost: Number(p.averageCost) * qty,
        reason: "Estoque inicial (seed)",
      },
    });
    await prisma.product.update({
      where: { id: p.id },
      data: { currentStock: qty },
    });
  }
  console.log(`[seed] Created initial stock entries for ${products.length} products.`);
}

async function seedGuestsAndReservations(): Promise<void> {
  const guestCount = await prisma.guest.count();
  if (guestCount > 0) {
    console.log("[seed] Guests and reservations already present. Skipping.");
    return;
  }

  const guests = await Promise.all([
    prisma.guest.create({ data: { name: "Carlos Oliveira", phone: "(11) 91234-5678", document: "123.456.789-00", email: "carlos@example.com" } }),
    prisma.guest.create({ data: { name: "Ana Beatriz Silva", phone: "(21) 98765-4321", document: "987.654.321-00" } }),
    prisma.guest.create({ data: { name: "Roberto Almeida", phone: "(31) 99876-5432" } }),
  ]);

  const room101 = await prisma.room.findUnique({ where: { number: "101" } });
  const room201 = await prisma.room.findUnique({ where: { number: "201" } });

  if (room101) {
    const today = new Date();
    const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
    const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6);
    await prisma.reservation.create({
      data: {
        guestId: guests[0].id,
        roomId: room101.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: 2,
        dailyRate: 280,
        status: "CONFIRMED",
        notes: "Reserva de exemplo — chegada em 3 dias",
      },
    });
  }

  if (room201) {
    const today = new Date();
    const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4);
    await prisma.reservation.create({
      data: {
        guestId: guests[1].id,
        roomId: room201.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: 4,
        children: 1,
        dailyRate: 460,
        status: "PRE_RESERVED",
        notes: "Família com criança pequena — precisa de berço",
      },
    });
  }

  console.log(`[seed] Created 3 guests and 2 sample reservations.`);
}

async function main(): Promise<void> {
  await seedPermissionCatalog();
  const adminId = await seedAdmin();
  await backfillApprovedUserPermissions(adminId);
  await seedSampleData();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
