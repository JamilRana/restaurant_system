// app/components/Admin/StaffModal.tsx
"use client";

import { useState, useEffect } from "react";

type StaffRole = "CHEF" | "WAITER" | "MANAGER" | "CASHIER" | "DELIVERY" | "CLEANER" | "OTHER";
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

export default function StaffModal({ staff, onClose, onSubmit }: StaffModalProps) {
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

  useEffect(() => {
    if (staff) {
      setFormData({
        ...staff,
        hireDate: staff.hireDate.split("T")[0],
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number"
          ? value === ""
            ? null
            : Number(value)
          : type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value === "" ? null : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {staff?.id ? "Edit Staff" : "Add New Staff"}
        </h2>

        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
            <label className="block text-sm font-medium mb-1">Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
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
            <label className="block text-sm font-medium mb-1">Hire Date</label>
            <input
              type="date"
              name="hireDate"
              value={formData.hireDate}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Salary (£)</label>
              <input
                type="number"
                step="0.01"
                name="salary"
                value={formData.salary || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate (£)</label>
              <input
                type="number"
                step="0.01"
                name="hourlyRate"
                value={formData.hourlyRate || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="e.g. 12.50"
              />
            </div>
            <div><label className="block text-sm font-medium mb-1">Salary Period</label>
            <select
              name="salaryPeriod"
              value={formData.salaryPeriod || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">— Select —</option>
              <option value="HOURLY">Hourly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="active">Active</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isSubmitting ? "Saving..." : staff?.id ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}