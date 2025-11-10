export interface ReservationItem {
  id: string;
  displayId: string | null;
  startTime: string;
  endTime: string;
  justification: string;
  subject: string | null;
  coordinator: string | null;
  teacher: string | null;
  status: string;
  user: { id: string; name: string | null; email: string };
  space?: { id: string; name: string; responsibleUserId?: string | null }; // Add responsibleUserId
  equipment?: { id: string; name: string; responsibleUserId?: string | null; space?: { id: string; name: string } | null }; // Add responsibleUserId and space info
  workshop?: { id: string; name: string };
}

export interface GroupedReservation {
  cartSubmissionId: string;
  items: ReservationItem[];
  overallStatus: string; // PENDING, APPROVED, REJECTED, PARTIALLY_APPROVED
}