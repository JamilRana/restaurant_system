// components/Admin/PromoCodeModal.tsx
"use client";

import { useState } from "react";

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

export default function PromoCodeModal({ promo, onClose, onSubmit }: PromoCodeModalProps) {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

// components/Admin/PromoCodeModal.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const fd = new FormData();
  
  if (promo?.id) {
    fd.append("id", String(promo.id)); // ✅ Must be sent
  }

  fd.append("code", formData.code);
  if (formData.discountPercent !== "") fd.append("discountPercent", String(formData.discountPercent));
  if (formData.discountAmount !== "") fd.append("discountAmount", String(formData.discountAmount));
  if (formData.minOrderAmount !== "") fd.append("minOrderAmount", String(formData.minOrderAmount));
  if (formData.maxUses !== "") fd.append("maxUses", String(formData.maxUses));
  if (formData.expiresAt) fd.append("expiresAt", formData.expiresAt);
  fd.append("active", String(formData.active));

  try {
    await onSubmit(fd);
  } catch (err: any) {
    alert(err.message);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {promo ? "Edit Promo Code" : "Create Promo Code"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Code *</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={(e) =>
    setFormData({
      ...formData,
      code: e.target.value.toUpperCase(), // ✅ Force uppercase
    })
  }
              className="w-full border px-3 py-2 rounded"
              required
              placeholder="ENTER CODE"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium">Percent (%)</label>
              <input
                type="number"
                step="0.1"
                name="discountPercent"
                value={formData.discountPercent}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded text-sm"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Amount (£)</label>
              <input
                type="number"
                step="0.01"
                name="discountAmount"
                value={formData.discountAmount}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded text-sm"
                placeholder="2.50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Min Order (£)</label>
            <input
              type="number"
              step="0.01"
              name="minOrderAmount"
              value={formData.minOrderAmount}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Max Uses</label>
            <input
              type="number"
              name="maxUses"
              value={formData.maxUses}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Expires At</label>
            <input
              type="datetime-local"
              name="expiresAt"
              value={formData.expiresAt}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
            />
            <label className="text-sm">Active</label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}