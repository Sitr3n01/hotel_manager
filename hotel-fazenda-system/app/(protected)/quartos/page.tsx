import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { QuartosPageClient } from "@/components/quartos/quartos-page-client";
import { canViewRooms } from "@/lib/permissions";
import {
  serializeRoomTypeWithCountForClient,
  serializeRoomWithTypeForClient,
} from "@/lib/client-serialization";
import { redirect } from "next/navigation";

export default async function QuartosPage() {
  const user = await requireAuth();

  if (!canViewRooms(user)) {
    redirect("/dashboard");
  }

  const [roomTypes, rooms] = await Promise.all([
    prisma.roomType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { rooms: true } } },
    }),
    prisma.room.findMany({
      orderBy: { number: "asc" },
      include: { roomType: true },
    }),
  ]);

  return (
    <QuartosPageClient
      userRole={user.role}
      roomTypes={roomTypes.map(serializeRoomTypeWithCountForClient)}
      rooms={rooms.map(serializeRoomWithTypeForClient)}
    />
  );
}
