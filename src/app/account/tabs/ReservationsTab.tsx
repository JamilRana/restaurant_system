// app/account/tabs/ReservationsTab.tsx
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function ReservationsTab() {
  const { data: session } = useSession();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    COMPLETED: "bg-gray-100 text-gray-800",
  } as const;

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchReservations = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/tables/reservations/list?userId=${session.user.id}&limit=5&page=${page}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setReservations(data.reservations || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error("Failed to load reservations", err);
        setReservations([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, [session, page]);

  // const handleCancel = async (id: number) => {
  //   if (!confirm("Cancel this reservation?")) return;

  //   const res = await fetch("/api/reservations/cancel", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ reservationId: id }),
  //   });

  //   if (res.ok) {
  //     setReservations((prev) =>
  //       prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r))
  //     );
  //     alert("Reservation cancelled.");
  //   } else {
  //     const data = await res.json();
  //     alert(data.error || "Failed to cancel");
  //   }
  // };

  const handleCancel = async () => {
    if (!confirm("Cancel this reservation?")) return;
    try {
      const res = await fetch(`/api/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: session?.user?.phone,
          email: session?.user?.email,
          type: "reservation",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Reservation cancelled.");
        window.location.reload();
      } else {
        alert(data.error || "Failed to cancel reservation.");
      }
    } catch (err) {
      alert("An error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading reservations...</div>;
  }

  const now = new Date();
  const upcoming = reservations.filter((r) => new Date(r.startsAt) >= now);
  const past = reservations.filter((r) => new Date(r.startsAt) < now);

  return (
    <div>
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Upcoming Reservations
          </h3>
          <div className="space-y-4">
            {upcoming.map((r) => (
              <ReservationRow
                key={r.id}
                reservation={r}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
            Past Reservations
          </h3>
          <div className="space-y-4">
            {past.map((r) => (
              <ReservationRow key={r.id} reservation={r} disabled />
            ))}
          </div>
        </section>
      )}

      {reservations.length === 0 && (
        <p className="text-gray-500 text-center py-6">
          No reservations yet.{" "}
          <a href="/book" className="text-blue-500 hover:underline">
            Book a table
          </a>
          .
        </p>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Keep your compact ReservationRow
function ReservationRow({ reservation, onCancel, disabled = false }: any) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    COMPLETED: "bg-gray-100 text-gray-800",
  } as const;

  const date = new Date(reservation.startsAt);
  const formattedDate = date.toLocaleDateString();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const table = reservation.tables[0]?.table.number || "TBD";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200/60 rounded-lg bg-white/70 hover:bg-white transition text-sm">
      <div className="flex-1 space-y-1">
        <p className="font-medium text-gray-800">{reservation.name}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
          <span>{reservation.guests} guests</span>
          <span>
            {formattedDate} at {time}
          </span>
          <span>Table {table}</span>
          <span className="hidden sm:inline">
            • {reservation.restaurant?.name}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 sm:mt-0">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            statusColors[reservation.status as keyof typeof statusColors]
          }`}
        >
          {reservation.status}
        </span>
        {!disabled && ["PENDING", "CONFIRMED"].includes(reservation.status) && (
          <button
            onClick={() => onCancel(reservation.id)}
            className="text-red-500 hover:text-red-700 text-xs font-medium transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
