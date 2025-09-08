"use client";

import { useState, useEffect } from "react";

import { User } from "@/types";

interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function UserModal({ user, onClose, onSubmit }: UserModalProps) {
  const [formData, setFormData] = useState<User>({
    email: "",
    role: "CUSTOMER",
    customer: null,
    staff: null,
  } as User);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        customer: user.customer
          ? {
              name: user.customer.name || "",
              phone: user.customer.phone || "",
              address: user.customer.address || "",
              postcode: user.customer.postcode || "",
            }
          : null,
        staff: user.staff
          ? {
              id: user.staff.id,
              name: user.staff.name || "",
              role: user.staff.role,
              active: user.staff.active,
            }
          : null,
      });
    } else {
      resetForm();
    }
  }, [user]);

  const resetForm = () => {
    setFormData({
      email: "",
      role: "CUSTOMER",
      customer: null,
      staff: null,
    } as User);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      customer: prev.customer
        ? { ...prev.customer, [name]: value }
        : { name: "", phone: "", address: "", postcode: "" },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.email.trim()) {
      setError("Email is required");
      setIsSubmitting(false);
      return;
    }

    const payload: any = {
      id: formData.id,
      email: formData.email,
      role: formData.role,
      name: formData.customer?.name || formData.staff?.name || "",
      phone: formData.customer?.phone || "",
      address: formData.customer?.address || "",
      postcode: formData.customer?.postcode || "",
    };

    if (formData.role === "STAFF" && formData.staff?.id) {
      payload.staffId = formData.staff.id;
    }

    if (!formData.id) {
      const password = (
        document.querySelector('input[name="password"]') as HTMLInputElement
      )?.value;
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters");
        setIsSubmitting(false);
        return;
      }
      payload.password = password;
    }

    try {
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-7 border-b border-slate-200/60">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 leading-tight">
              {user?.id ? "Edit User" : "Create User"}
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              {user?.id
                ? "Update user details and permissions"
                : "Add a new team member or customer"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200"
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-7 space-y-5"
        >
          {" "}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
              <svg
                className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0"
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
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              placeholder="user@company.com"
              required
              autoFocus
            />
          </div>
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
              required
            >
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="CUSTOMER">Customer</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          {/* Staff ID (only for STAFF) */}
          {formData.role === "STAFF" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Staff ID
              </label>
              <input
                type="number"
                name="staffId"
                value={formData.staff?.id || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    staff: prev.staff
                      ? { ...prev.staff, id: Number(e.target.value) }
                      : {
                          id: Number(e.target.value),
                          name: "",
                          role: "",
                          active: true,
                        },
                  }))
                }
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Link existing staff by ID"
              />
            </div>
          )}
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.customer?.name || formData.staff?.name || ""}
              onChange={handleCustomerChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="John Smith"
            />
          </div>
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.customer?.phone || ""}
              onChange={handleCustomerChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.customer?.address || ""}
              onChange={handleCustomerChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="123 Main St, City"
            />
          </div>
          {/* Postcode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Postcode
            </label>
            <input
              type="text"
              name="postcode"
              value={formData.customer?.postcode || ""}
              onChange={handleCustomerChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="10001"
            />
          </div>
          {/* Password (only on create) */}
          {!user?.id && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          )}
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60 bg-slate-50/40 -mx-7 px-7 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all font-medium disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium disabled:bg-indigo-400 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : user?.id ? (
                "Update User"
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
