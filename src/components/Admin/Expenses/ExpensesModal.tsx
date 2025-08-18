// components/Admin/Expenses/ExpenseModal.tsx
"use client";

import { useState, useEffect } from "react";
import type { ExpenseFormValues } from "@/types"; // Make sure this is your correct type

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseFormValues | null;
  onSave: () => void;
  staffList: { id: number; name: string; role: string }[];
}

// ✅ Define a form-specific type — do NOT use Omit if it leaves required fields
type FormValues = {
  description: string;
  category: ExpenseFormValues["category"]; // e.g., ExpenseCategory
  amount: string; // string for input
  date: string; // YYYY-MM-DD
  recurring: boolean;
  notes: string | null;
  staffId: string; // string for form handling
};

export default function ExpenseModal({
  isOpen,
  onClose,
  expense,
  onSave,
  staffList,
}: ExpenseModalProps) {
  const [formData, setFormData] = useState<FormValues>({
    description: "",
    category: "OTHER",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    recurring: false,
    notes: "",
    staffId: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Reset form when expense or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (expense) {
      setFormData({
        description: expense.description,
        category: expense.category,
        amount: expense.amount.toString(), // number → string
        date: expense.date,
        recurring: expense.recurring,
        notes: expense.notes || "",
        staffId: expense.staffId?.toString() || "", // number → string
      });
      setSearch(expense.staff ? `${expense.staff.name} (${expense.staff.role})` : "");
    } else {
      setFormData({
        description: "",
        category: "OTHER",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        recurring: false,
        notes: "",
        staffId: "",
      });
      setSearch("");
    }
    setError("");
  }, [expense, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Valid amount is required");
      return;
    }

    const staffId = formData.staffId ? parseInt(formData.staffId, 10) : null;
    if (isNaN(staffId as number) && staffId !== null) {
      setError("Invalid staff ID");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const method = expense ? "PUT" : "POST";
      const url = "/api/admin/expenses";
      const payload = {
        ...(expense?.id && { id: expense.id }),
        description: formData.description,
        category: formData.category,
        amount,
        date: formData.date,
        recurring: formData.recurring,
        notes: formData.notes || null,
        staffId,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save expense");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredStaff = staffList.filter(
    (staff) =>
      staff.name.toLowerCase().includes(search.toLowerCase()) ||
      staff.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {expense ? "Edit Expense" : "Add New Expense"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., Office Supplies"
              disabled={isSubmitting}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {[
                "SALARY",
                "GROCERIES",
                "UTILITIES",
                "RENT",
                "MAINTENANCE",
                "EQUIPMENT",
                "MARKETING",
                "INSURANCE",
                "TRAVEL",
                "OTHER",
              ].map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (£) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Staff Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Staff (Optional)
            </label>
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={() => setIsDropdownOpen(true)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            {isDropdownOpen && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                <li
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, staffId: "" }));
                    setSearch("");
                    setIsDropdownOpen(false);
                  }}
                >
                  — None —
                </li>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <li
                      key={staff.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, staffId: staff.id.toString() }));
                        setSearch(`${staff.name} (${staff.role})`);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {staff.name}{" "}
                      <span className="text-gray-500">({staff.role})</span>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-gray-500 text-sm">No staff found</li>
                )}
              </ul>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes ?? ""}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details..."
              disabled={isSubmitting}
            />
          </div>

          {/* Recurring */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="recurring"
              checked={formData.recurring}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              id="recurring"
              disabled={isSubmitting}
            />
            <label htmlFor="recurring" className="ml-2 block text-sm text-gray-700">
              Recurring expense
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : expense ? (
                "Update Expense"
              ) : (
                "Add Expense"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-md"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}