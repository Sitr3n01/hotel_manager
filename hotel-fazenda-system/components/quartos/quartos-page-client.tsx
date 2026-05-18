"use client";

import { BedDouble, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomsTab } from "@/components/quartos/rooms-tab";
import { RoomTypesTab } from "@/components/quartos/room-types-tab";
import type { RoomTypeWithCountForClient, RoomWithTypeForClient } from "@/lib/client-serialization";
import type { Role } from "@prisma/client";

type Props = {
  userRole: Role;
  roomTypes: RoomTypeWithCountForClient[];
  rooms: RoomWithTypeForClient[];
};

export function QuartosPageClient({ userRole, roomTypes, rooms }: Props) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Quartos</h1>
        <p className="text-muted-foreground text-sm">
          Cadastro, consulta e gestão de quartos e tipos de quarto do hotel.
        </p>
      </header>

      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">
            <BedDouble className="h-4 w-4" />
            Quartos
          </TabsTrigger>
          <TabsTrigger value="types">
            <Tag className="h-4 w-4" />
            Tipos de quarto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="pt-4">
          <RoomsTab rooms={rooms} roomTypes={roomTypes} userRole={userRole} />
        </TabsContent>

        <TabsContent value="types" className="pt-4">
          <RoomTypesTab roomTypes={roomTypes} userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
