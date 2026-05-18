-- CreateIndex
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");

-- CreateIndex
CREATE INDEX "Reservation_guestId_idx" ON "Reservation"("guestId");

-- CreateIndex
CREATE INDEX "Reservation_createdById_idx" ON "Reservation"("createdById");

-- CreateIndex
CREATE INDEX "StockMovement_createdById_idx" ON "StockMovement"("createdById");

-- CreateIndex
CREATE INDEX "ReservationConsumption_productId_idx" ON "ReservationConsumption"("productId");

-- CreateIndex
CREATE INDEX "ReservationConsumption_createdById_idx" ON "ReservationConsumption"("createdById");

-- CreateIndex
CREATE INDEX "FinancialClosing_closedById_idx" ON "FinancialClosing"("closedById");
