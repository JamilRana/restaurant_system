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
  onSubmit: (formData: FormData) => void;
};

export default function ZoneModal({ zone, onClose, onSubmit }: ZoneModalProps) {
  const [postcode, setpostcode] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([""]);
  const [errors, setErrors] = useState<{ postcode?: string; fee?: string; slots?: string }>({});

  useEffect(() => {
    if (zone) {
      setpostcode(zone.postcode);
      setDeliveryFee(zone.deliveryFee.toString());
    } else {
      setpostcode("");
      setDeliveryFee("");
    }
  }, [zone]);


  const validate = () => {
    const newErrors: any = {};
    if (!postcode.trim()) newErrors.postcode = "postcode is required";
    if (!deliveryFee || isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0)
      newErrors.fee = "Valid delivery fee is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    if (zone?.id) formData.append("id", zone.id.toString());
    formData.append("postcode", postcode);
    formData.append("deliveryFee", deliveryFee);
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {zone ? "Edit Delivery Zone" : "Add Delivery Zone"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">postcode *</label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setpostcode(e.target.value)}
                className={`w-full border px-3 py-2 rounded ${errors.postcode ? "border-red-500" : ""}`}
                required
              />
              {errors.postcode && <p className="text-red-500 text-xs mt-1">{errors.postcode}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Delivery Fee *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className={`w-full border px-3 py-2 rounded ${errors.fee ? "border-red-500" : ""}`}
                required
              />
              {errors.fee && <p className="text-red-500 text-xs mt-1">{errors.fee}</p>}
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
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