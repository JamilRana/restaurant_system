// components/Admin/ZoneModal.tsx
import { useState, useEffect } from "react";

type DeliveryZone = {
  id?: number;
  postcode: string;
  deliveryFee: number;
};

type ZoneModalProps = {
  zone: DeliveryZone | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function ZoneModal({ zone, onClose, onSubmit }: ZoneModalProps) {
  const [postcode, setPostcode] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [errors, setErrors] = useState<{
    postcode?: string;
    fee?: string;
  }>({});

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

  // Initialize form with zone data
  useEffect(() => {
    if (zone) {
      setPostcode(zone.postcode);
      setDeliveryFee(zone.deliveryFee.toString());
    } else {
      setPostcode("");
      setDeliveryFee("");
    }
    setErrors({});
  }, [zone]);

  const validate = () => {
    const newErrors: any = {};
    if (!postcode.trim()) newErrors.postcode = "Postcode is required";
    if (
      !deliveryFee ||
      isNaN(parseFloat(deliveryFee)) ||
      parseFloat(deliveryFee) < 0
    ) {
      newErrors.fee = "Valid delivery fee is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    if (zone?.id) formData.append("id", zone.id.toString());
    formData.append("postcode", postcode.trim().toUpperCase());
    formData.append("deliveryFee", deliveryFee);

    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      console.error("Submission failed:", err);
    } finally {
      setSubmitting(false);
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
              {zone ? "Edit Delivery Zone" : "Add Delivery Zone"}
            </h2>
            <p className="text-slate-600 mt-1">
              {zone ? "Update zone details" : "Add a new delivery area"}
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Postcode *
            </label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="e.g., SW1A 1AA"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase ${
                errors.postcode ? "border-red-500" : "border-slate-300"
              }`}
              required
              autoFocus
            />

            {errors.postcode && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
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
                {errors.postcode}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Delivery Fee (£) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.fee ? "border-red-500" : "border-slate-300"
              }`}
              required
            />
            {errors.fee && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
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
                {errors.fee}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Enter the delivery charge for this postcode area
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/70 bg-slate-50/30">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : zone ? (
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
