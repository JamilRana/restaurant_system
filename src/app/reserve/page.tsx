// app/reserve/page.tsx

import ReservationForm from "@/components/Cart/ReservationForm";

export default function ReservePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-2">
      <div className="max-w-3xl mx-auto">
        <ReservationForm />
      </div>
    </div>
  );
}
