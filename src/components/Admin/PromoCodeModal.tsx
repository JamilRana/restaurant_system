// components/Admin/PromoCodeModal.tsx
"use client";

import { useState, useEffect } from "react";

type PromoCode = {
  id?: number;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  expiresAt: string | null;
  active: boolean;
};

type PromoCodeModalProps = {
  promo: PromoCode | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function PromoCodeModal({
  promo,
  onClose,
  onSubmit,
}: PromoCodeModalProps) {
  const [formData, setFormData] = useState({
    code: promo?.code || "",
    discountPercent: promo?.discountPercent || "",
    discountAmount: promo?.discountAmount || "",
    minOrderAmount: promo?.minOrderAmount || "",
    maxUses: promo?.maxUses || "",
    expiresAt: promo?.expiresAt
      ? new Date(promo.expiresAt).toISOString().slice(0, 16)
      : "",
    active: promo?.active ?? true,
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

  // Close on click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.code.trim()) {
      setError("Promo code is required");
      setIsSubmitting(false);
      return;
    }

    if (!formData.discountPercent && !formData.discountAmount) {
      setError("You must provide either a percentage or amount discount");
      setIsSubmitting(false);
      return;
    }

    const fd = new FormData();

    if (promo?.id) {
      fd.append("id", String(promo.id));
    }

    fd.append("code", formData.code.toUpperCase());
    if (formData.discountPercent !== "")
      fd.append("discountPercent", String(formData.discountPercent));
    if (formData.discountAmount !== "")
      fd.append("discountAmount", String(formData.discountAmount));
    if (formData.minOrderAmount !== "")
      fd.append("minOrderAmount", String(formData.minOrderAmount));
    if (formData.maxUses !== "") fd.append("maxUses", String(formData.maxUses));
    if (formData.expiresAt) fd.append("expiresAt", formData.expiresAt);
    fd.append("active", String(formData.active));

    try {
      await onSubmit(fd);
      onClose();
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/70">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {promo ? "Edit Promo Code" : "Create Promo Code"}
            </h2>
            <p className="text-slate-600 mt-1">
              {promo
                ? "Update promo code details"
                : "Create a new discount offer"}
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
              Promo Code *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value.toUpperCase(),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="ENTER10"
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-500">
              {formData.code.length}/20 characters (uppercase)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Percent Discount (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                name="discountPercent"
                value={formData.discountPercent}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount Discount (£)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="discountAmount"
                value={formData.discountAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="2.50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Minimum Order (£)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="minOrderAmount"
                value={formData.minOrderAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="10.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Maximum Uses
              </label>
              <input
                type="number"
                min="1"
                name="maxUses"
                value={formData.maxUses}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expiration Date
            </label>
            <input
              type="datetime-local"
              name="expiresAt"
              value={formData.expiresAt}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              name="active"
              id="active"
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
              ) : promo ? (
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
