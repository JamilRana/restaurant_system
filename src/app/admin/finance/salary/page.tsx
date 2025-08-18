// app/admin/finance/salary/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StaffDuePayment, SalaryPayment } from "@/types";

export default function SalaryPayments() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [dueStaff, setDueStaff] = useState<StaffDuePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState({
    staffId: "",
    amount: "",
    notes: "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!session) return;
    fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, dueRes] = await Promise.all([
        fetch("/api/admin/expenses/salary/history").then((r) => r.json()),
        fetch("/api/admin/expenses/salary/due").then((r) => r.json()),
      ]);
      setPayments(paymentsRes);
      setDueStaff(dueRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.staffId || !paymentForm.amount) {
      alert("Please select staff and enter amount");
      return;
    }

    try {
      const response = await fetch("/api/admin/expenses/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: parseInt(paymentForm.staffId),
          amount: parseFloat(paymentForm.amount),
          notes: paymentForm.notes,
        }),
      });

      if (response.ok) {
        setSuccessMessage("Payment recorded successfully!");
        setPaymentForm({ staffId: "", amount: "", notes: "" });
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to record payment");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Salary Payments</h1>

      {/* Payment Form */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Record Salary Payment</h2>
        {successMessage && (
          <div className="bg-green-100 text-green-700 p-3 mb-4 rounded">
            {successMessage}
          </div>
        )}
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Staff *</label>
            <select
              value={paymentForm.staffId}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, staffId: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select staff member</option>
              {dueStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role}) - Due: £{staff.due}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">Amount (£) *</label>
            <input
              type="number"
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, amount: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Notes</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, notes: e.target.value })
              }
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Record Payment
          </button>
        </form>
      </section>

      {/* Due Payments */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Staff Due Payments</h2>
        {dueStaff.length === 0 ? (
          <div className="bg-green-100 text-green-700 p-4 rounded">
            All staff are paid up to date. Great job!
          </div>
        ) : (
          <table className="min-w-full bg-white border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Expected</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {dueStaff.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">{s.role}</td>
                  <td className="px-4 py-2">£{s.expected.toFixed(2)}</td>
                  <td className="px-4 py-2">£{s.paid.toFixed(2)}</td>
                  <td className="px-4 py-2 font-bold text-red-600">
                    £{s.due.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Payment History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        <table className="min-w-full bg-white border rounded">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No salary payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{p.staffName}</td>
                  <td className="px-4 py-2">{p.role}</td>
                  <td className="px-4 py-2 font-bold">
                    £{p.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{p.date}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{p.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
