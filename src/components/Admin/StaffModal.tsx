// app/components/Admin/StaffModal.tsx
"use client";

import { useState, useEffect } from "react";

type StaffRole =
  | "CHEF"
  | "WAITER"
  | "MANAGER"
  | "CASHIER"
  | "DELIVERY"
  | "CLEANER"
  | "OTHER";
type SalaryPeriod = "HOURLY" | "WEEKLY" | "MONTHLY";

interface Staff {
  id?: number;
  name: string;
  role: StaffRole;
  email: string | null;
  phone: string | null;
  hireDate: string;
  salary: number | null;
  hourlyRate: number | null;
  salaryPeriod: SalaryPeriod | null;
  active: boolean;
}

interface StaffModalProps {
  staff: Staff | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function StaffModal({
  staff,
  onClose,
  onSubmit,
}: StaffModalProps) {
  const [formData, setFormData] = useState<Staff>({
    name: "",
    role: "OTHER",
    email: null,
    phone: null,
    hireDate: new Date().toISOString().split("T")[0],
    salary: null,
    hourlyRate: null,
    salaryPeriod: "MONTHLY",
    active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (staff) {
      console.log("Raw staff passed to modal:", staff);
      console.log("typeof salary:", typeof staff.salary);

      const cleanSalary: number | null =
        staff.salary === null || isNaN(Number(staff.salary))
          ? null
          : Number(staff.salary);

      const cleanHourlyRate: number | null =
        staff.hourlyRate === null || isNaN(Number(staff.hourlyRate))
          ? null
          : Number(staff.hourlyRate);
      console.log("Cleaned salary:", cleanSalary);
      console.log("Cleaned hourlyRate:", cleanHourlyRate);

      setFormData({
        ...staff,
        salary: cleanSalary,
        hourlyRate: cleanHourlyRate,
        hireDate: staff.hireDate ? staff.hireDate.split("T")[0] : "",
      });
    } else {
      resetForm();
    }
  }, [staff]);

  const resetForm = () => {
    setFormData({
      name: "",
      role: "OTHER",
      email: null,
      phone: null,
      hireDate: new Date().toISOString().split("T")[0],
      salary: null,
      hourlyRate: null,
      salaryPeriod: "MONTHLY",
      active: true,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    let parsedValue: string | number | boolean | null;

    if (type === "number") {
      parsedValue = value === "" ? null : parseFloat(value);
      if (isNaN(parsedValue as number)) parsedValue = null;
    } else if (type === "checkbox") {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else {
      parsedValue = value === "" ? null : value;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      setError("Staff name is required");
      setIsSubmitting(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      setIsSubmitting(false);
      return;
    }

    if (!formData.salary && !formData.hourlyRate) {
      setError("Please provide either a salary or hourly rate");
      setIsSubmitting(false);
      return;
    }

    if (formData.salary && !formData.salaryPeriod) {
      setError("Please select a salary period for the salary");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        id: formData.id,
        name: formData.name,
        role: formData.role,
        email: formData.email,
        phone: formData.phone,
        hireDate: formData.hireDate, // already YYYY-MM-DD
        salary: formData.salary,
        hourlyRate: formData.hourlyRate,
        salaryPeriod: formData.salaryPeriod,
        active: formData.active,
      };
      await onSubmit(payload); // This goes to API
    } catch (err: any) {
      if (err?.response?.data?.details) {
        console.error("Validation errors:", err.response.data.details);
        setError(
          "Validation: " +
            err.response.data.details.map((d: any) => d.message).join(", ")
        );
      } else {
        setError(err.message || "Save failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/70">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {staff?.id ? "Edit Staff Member" : "Add New Staff Member"}
            </h2>
            <p className="text-slate-600 mt-1">
              {staff?.id ? "Update staff details" : "Add a new team member"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="CHEF">Chef</option>
                <option value="WAITER">Waiter</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
                <option value="DELIVERY">Delivery</option>
                <option value="CLEANER">Cleaner</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hire Date
              </label>
              <input
                type="date"
                name="hireDate"
                value={formData.hireDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. 07123456789"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Salary (£)
              </label>
              <input
                type="number"
                step="0.01"
                name="salary"
                value={formData.salary ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hourly Rate (£)
              </label>
              <input
                type="number"
                step="0.01"
                name="hourlyRate"
                value={formData.hourlyRate ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. 12.50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Salary Period
              </label>
              <select
                name="salaryPeriod"
                value={formData.salaryPeriod ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">— Select —</option>
                <option value="HOURLY">Hourly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label
              htmlFor="active"
              className="text-sm font-medium text-slate-700"
            >
              Active
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/70 bg-slate-50/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : staff?.id ? (
                "Update"
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
