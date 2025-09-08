"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import OrderDetailsModal from "@/components/Order/OrderDetailsModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSession } from "next-auth/react";

export default function Dashboard() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    reservations: any[];
    orders: any[];
  } | null>(null);

  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // 🔁 Auto-submit when URL params change
  useEffect(() => {
    const urlPhone = searchParams.get("phone") || session?.user?.phone;
    const urlEmail = searchParams.get("email") || session?.user?.email;

    if (urlPhone && urlEmail) {
      setPhone(urlPhone);
      setEmail(urlEmail);
      autoSubmit(urlPhone, urlEmail);
    }
  }, [searchParams]);

  const autoSubmit = async (phone: string, email: string) => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email }),
      });

      const result = await res.json();

      if (res.ok) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Unable to connect. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !email) return;
    autoSubmit(phone, email);
  };

  const handleBack = () => {
    setData(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("phone");
    url.searchParams.delete("email");
    window.history.replaceState({}, "", url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">
            My Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            View your reservations and orders in one place
          </p>
        </header>

        {!data ? (
          <FormView
            phone={phone}
            email={email}
            setPhone={setPhone}
            setEmail={setEmail}
            handleSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        ) : (
          <DataView data={data} onBack={handleBack} loading={loading} />
        )}
      </div>
    </div>
  );
}

// ✅ Form View
function FormView({
  phone,
  email,
  setPhone,
  setEmail,
  handleSubmit,
  loading,
  error,
}: any) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mx-auto max-w-lg border border-gray-200">
      <p className="text-gray-600 mb-6 text-center">
        Enter your details to view your reservations and orders.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="e.g. 07123 456 789"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="you@example.com"
            required
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner />
              Loading...
            </>
          ) : (
            "View My Orders & Reservations"
          )}
        </button>
      </form>
    </div>
  );
}

// ✅ Data View
// ✅ DataView with Grid Layout
// ✅ DataView
function DataView({ data, onBack, loading }: any) {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone");
  const email = searchParams.get("email");

  return (
    <div>
      <button
        onClick={onBack}
        disabled={loading}
        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-6 transition disabled:opacity-50"
      >
        ← <span className="ml-1">Back to Search</span>
      </button>

      {loading && (
        <div className="flex justify-center my-6">
          <LoadingSpinner />
        </div>
      )}

      {/* Reservations */}
      <Section
        title="Reservations"
        items={data.reservations}
        emptyMessage="No active reservations"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.reservations.map((r: any) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              phone={phone!}
              email={email!}
            />
          ))}
        </div>
      </Section>

      {/* Orders */}
      <Section
        title="Orders"
        items={data.orders}
        emptyMessage="No active orders"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.orders.map((o: any) => (
            <OrderCard key={o.id} order={o} phone={phone!} email={email!} />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ✅ Reusable Section
function Section({ title, items, emptyMessage, children }: any) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-4">{children}</div>
      ) : (
        <p className="text-gray-500 italic">{emptyMessage}</p>
      )}
    </div>
  );
}

// ✅ ReservationCard
function ReservationCard({
  reservation,
  phone,
  email,
}: {
  reservation: any;
  phone: string;
  email: string;
}) {
  const formattedDate = new Date(reservation.startsAt).toLocaleDateString();
  const time = new Date(reservation.startsAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const tableNumber = reservation.tables[0]?.table.number || "Not assigned";

  const cancelReservation = async () => {
    if (!confirm("Cancel this reservation?")) return;
    try {
      const res = await fetch(`/api/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          email,
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow transition text-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-800">{reservation.name}</h3>
          <p className="text-gray-600">{reservation.guests} guests</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            reservation.status === "CONFIRMED"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {reservation.status}
        </span>
      </div>

      <p>
        <strong>Date:</strong> {formattedDate}
      </p>
      <p>
        <strong>Time:</strong> {time}
      </p>
      <p>
        <strong>Table:</strong> {tableNumber}
      </p>

      {(reservation.status === "PENDING" ||
        reservation.status === "CONFIRMED") && (
        <button
          onClick={cancelReservation}
          className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function OrderCard({
  order,
  phone,
  email,
}: {
  order: any;
  phone: string;
  email: string;
}) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const formattedDate = new Date(order.createdAt).toLocaleDateString();
  const time = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const cancelOrder = async () => {
    if (!confirm("Cancel this order?")) return;
    try {
      const res = await fetch(`/api/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          email,
          type: "order",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Order cancelled.");
        window.location.reload(); // Or better: refetch data
      } else {
        alert(data.error || "Failed to cancel order.");
      }
    } catch (err) {
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow transition text-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">
            £{order.finalAmount || order.totalAmount}
          </p>
          <p className="text-gray-600">
            {formattedDate} at {time}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            order.status === "PLACED"
              ? "bg-blue-100 text-blue-800"
              : order.status === "PREPARING"
              ? "bg-orange-100 text-orange-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {order.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <button
          onClick={() => setSelectedOrder(order)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition flex-1"
        >
          Details
        </button>
        {order.status === "PLACED" && (
          <button
            onClick={cancelOrder}
            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition flex-1"
          >
            Cancel
          </button>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
