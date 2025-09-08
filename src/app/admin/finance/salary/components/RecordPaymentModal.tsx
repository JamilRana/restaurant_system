// app/admin/finance/salary/components/RecordPaymentModal.tsx
"use client";

import { useState } from "react";
import { ApiStaff } from "@/types";

// ✅ Correct and complete Props type
type Props = {
  staff: ApiStaff;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    amount: number;
    notes: string;
    hours: number;
    overtimeHours?: number;
  }) => void; // Can be async (Promise<void> is fine)
  loading?: boolean;
};

export default function RecordPaymentModal({
  staff,
  isOpen,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [amount, setAmount] = useState<string>(staff.due.toFixed(2));
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState<string>("8");
  const [overtimeHours, setOvertimeHours] = useState<string>("0");
  const [overtimeRate, setOvertimeRate] = useState<string>("1.5");

  const hourlyRate = staff.hourlyRate || 0;
  const regHours = parseFloat(hours) || 0;
  const otHours = parseFloat(overtimeHours) || 0;
  const otRate = parseFloat(overtimeRate) || 1.5;

  const regularPay = regHours * hourlyRate;
  const overtimePay = otHours * hourlyRate * otRate;
  const total = regularPay + overtimePay;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regHours < 0 || otHours < 0) return alert("Hours cannot be negative");

    // ✅ Pass all required fields
    onSubmit({
      amount: parseFloat(total.toFixed(2)),
      notes,
      hours: regHours,
      overtimeHours: otHours > 0 ? otHours : undefined,
    });
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff
            </label>
            <div className="font-medium text-gray-900">
              {staff.name} ({staff.role})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (£) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="0.01"
              max={staff.due * 2} // Allow overpayment
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Due: £{staff.due.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="e.g. October weekly payroll"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                "Record Payment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
