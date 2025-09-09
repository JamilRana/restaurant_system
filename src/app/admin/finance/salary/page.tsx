// app/admin/finance/salary/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { calculateSalaryDue } from "./calculate";
import { RouteLoader } from "@/components/RouteLoader";
import PaymentHistory from "./components/PaymentHistory";
import DueStaffTable from "./components/DueStaffTable";
import RecordPaymentModal from "./components/RecordPaymentModal";

import { ApiStaff, SalaryPayment } from "@/types"; // ✅ Use shared types
import CSVExportButton from "@/components/CSVExportButton";
import TimeEntryModal from "./components/TimeEntryModal";

export default function SalaryPayments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [staffList, setStaffList] = useState<ApiStaff[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]); // ✅ Correct type
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<
    (ApiStaff & { due: number }) | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

  const [payPeriod, setPayPeriod] = useState({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, paymentsRes] = await Promise.all([
        fetch("/api/admin/staff").then((r) => r.json()),
        fetch("/api/admin/expenses/salary/history").then((r) => r.json()),
      ]);

      // ✅ Ensure we extract staff array correctly
      const staffArray = Array.isArray(staffRes) ? staffRes : staffRes.staff;
      setStaffList(staffArray.filter((s: ApiStaff) => s.active));

      // ✅ payments already match SalaryPayment type
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      fetchData();
    }
  }, [session, status, router]);

  const handlePaymentSubmit = async ({
    amount,
    notes,
    hours,
    overtimeHours,
  }: {
    amount: number;
    notes: string;
    hours: number;
    overtimeHours?: number;
  }) => {
    if (!selectedStaff) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/expenses/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          amount,
          notes: [
            notes,
            `Worked: ${hours}h regular`,
            overtimeHours ? `+ ${overtimeHours}h overtime` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSelectedStaff(null);
        await fetchData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      alert("Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };
  if (status === "loading" || loading) return <RouteLoader />;

  const start = new Date(payPeriod.start);
  const end = new Date(payPeriod.end);

  const dueStaff = staffList
    .map((staff) => {
      const staffPayments = payments.filter((p) => p.staffId === staff.id);
      return {
        ...staff,
        ...calculateSalaryDue(staff, staffPayments, start, end),
      };
    })
    .filter((s) => s.due > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Salary Payments</h1>
        <p className="text-gray-600">
          Manage weekly payroll and track staff compensation
        </p>
      </div>

      {/* Pay Period */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Current Pay Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              value={payPeriod.start}
              onChange={(e) =>
                setPayPeriod({ ...payPeriod, start: e.target.value })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="date"
              value={payPeriod.end}
              onChange={(e) =>
                setPayPeriod({ ...payPeriod, end: e.target.value })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Due Staff */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Payments Due ({dueStaff.length})
        </h2>
        <DueStaffTable
          staff={dueStaff}
          onPayClick={(staff) => {
            setSelectedStaff(staff);
            setIsTimeModalOpen(true); // Opens TimeEntryModal
          }}
          loading={false}
        />
      </section>

      {/* History */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Payments
          </h2>
          <CSVExportButton
            data={payments.map((p) => {
              const workedMatch = p.notes?.match(/Worked:\s*(\d+\.?\d*)h/);
              const otMatch = p.notes?.match(/\+\s*(\d+\.?\d*)h\s+overtime/);
              return {
                Staff: p.staffName,
                Role: p.role,
                Amount: `£${p.amount}`,
                Date: p.date,
                "Regular Hours": workedMatch ? workedMatch[1] : "0",
                "Overtime Hours": otMatch ? otMatch[1] : "0",
                Notes: p.notes || "",
              };
            })}
            headers={[
              { label: "Staff", key: "Staff" },
              { label: "Role", key: "Role" },
              { label: "Amount", key: "Amount" },
              { label: "Date", key: "Date" },
              { label: "Regular Hours", key: "Regular Hours" },
              { label: "Overtime Hours", key: "Overtime Hours" },
              { label: "Notes", key: "Notes" },
            ]}
            filename={`salary-payments-${
              new Date().toISOString().split("T")[0]
            }.csv`}
          />
        </div>
        <PaymentHistory payments={payments} limit={10} loading={false} />
      </section>

      {/* Modals */}
      {selectedStaff && (
        <>
          <RecordPaymentModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedStaff(null);
            }}
            staff={selectedStaff}
            onSubmit={handlePaymentSubmit}
            loading={submitting}
          />
          <TimeEntryModal
            isOpen={isTimeModalOpen}
            onClose={() => {
              setIsTimeModalOpen(false);
              setSelectedStaff(null);
            }}
            staff={selectedStaff}
            onSubmit={async ({
              totalHours,
              totalOvertimeHours,
              hourlyRate,
              overtimeRate,
              totalAmount,
              entries,
              notes,
            }) => {
              setSubmitting(true);
              try {
                const response = await fetch("/api/admin/expenses/salary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    staffId: selectedStaff.id,
                    amount: totalAmount,
                    notes: [
                      notes,
                      `Time Entry: ${totalHours}h reg, ${totalOvertimeHours}h OT`,
                      `Rate: £${hourlyRate}/hr, OT: ${overtimeRate}x`,
                      entries
                        .filter(
                          (e) =>
                            parseFloat(e.hours) > 0 ||
                            parseFloat(e.overtimeHours) > 0
                        )
                        .map(
                          (e) =>
                            `${e.date}: ${e.hours}h + ${e.overtimeHours}h OT`
                        )
                        .join("; "),
                    ]
                      .filter(Boolean)
                      .join(" | "),
                  }),
                });

                if (response.ok) {
                  setIsTimeModalOpen(false);
                  setSelectedStaff(null);
                  await fetchData(); // Refresh due/paid
                } else {
                  const error = await response.json();
                  alert(`Error: ${error.error}`);
                }
              } catch (err) {
                alert("Failed to record payment.");
              } finally {
                setSubmitting(false);
              }
            }}
            loading={submitting}
          />
        </>
      )}
    </div>
  );
}
