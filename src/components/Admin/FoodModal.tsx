// components/Admin/FoodModal.tsx
"use client";

import { useEffect, useState } from "react";

type FoodOption = {
  name: string;
  price: number;
};

type Food = {
  id?: number;
  name: string;
  description: string | null;
  image:string|null;
  price: number;
  categoryId: number;
  available: boolean;
  options: FoodOption[];
};

type FoodModalProps = {
  food: Food | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<any>;
};

export default function FoodModal({ food, onClose, onSubmit }: FoodModalProps) {
  const [name, setName] = useState(food?.name || "");
  const [description, setDescription] = useState(food?.description || "");
  const [price, setPrice] = useState<string>(food?.price?.toString() || "");
  const [categoryId, setCategoryId] = useState<string>(
    food?.categoryId?.toString() || ""
  );
  const [available, setAvailable] = useState<boolean>(
    food?.available ?? true
  );
  const [image, setImage] = useState<File | null>(null);
  const [options, setOptions] = useState<FoodOption[]>(
    food?.options || [{ name: "", price: 0 }]
  );

  const [categories, setCategories] = useState<
    { id: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
// useEffect
useEffect(() => {
  let isMounted = true;

  const fetchCats = async () => {
    try {
      const res = await fetch("/api/admin/category");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      let categoryList: { id: number; name: string }[] = [];


      if(data.categories && Array.isArray(data.categories)) {
        // Case 2: API returns paginated object
        categoryList = data.categories;
      }

      if (isMounted) {
        setCategories(categoryList);

        // Only set if editing and category exists
        if (food && !categoryId) {
          const found = categoryList.find((c) => c.id === food.categoryId);
          if (found) {
            setCategoryId(found.id.toString());
          }
        }
      }
    } catch (err: any) {
      if (isMounted) {
        setError(err.message);
      }
    }
  };

  fetchCats();

  return () => {
    isMounted = false;
  };
}, [food, categoryId]); // Re-run if food or categoryId changes

  const addOption = () => {
    setOptions([...options, { name: "", price: 0 }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (
  index: number,
  field: "name" | "price",
  value: string | number
) => {
  setOptions((prev) =>
    prev.map((opt, i) => {
      if (i !== index) return opt;
      if (field === "name") return { ...opt, name: value as string };
      if (field === "price") return { ...opt, price: value as number };
      return opt;
    })
  );
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    if (food?.id) formData.append("id", food.id.toString());
    formData.append("name", name);
    formData.append("description", description || "");
    formData.append("price", price);
    formData.append("categoryId", categoryId);
    formData.append("available", available.toString());
    if (image) formData.append("image", image);

    options.forEach((opt, idx) => {
      if (opt.name) {
        formData.append(`options[${idx}].name`, opt.name);
        formData.append(`options[${idx}].price`, opt.price.toString());
      }
    });

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {food ? "Edit Food" : "Add New Food"}
        </h2>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Price (£)</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Category</label>
              <select
  value={categoryId} // ← This must match the option value
  onChange={(e) => setCategoryId(e.target.value)}
  required
  className="w-full border px-3 py-2 rounded"
>
  <option value="">Select Category</option>
  {categories.map((cat) => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>
            </div>

            <div>
              <label className="block text-sm font-medium">Available</label>
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />{" "}
              Yes
            </div>

            <div>
              <label className="block text-sm font-medium">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="w-full border px-3 py-2 rounded"
              />
              {food?.image && (
                <div className="mt-2">
                  <img
                    src={food.image}
                    alt="Current"
                    className="w-16 h-16 object-cover rounded"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Options (e.g., Spicy, Large)</label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Option name"
                    value={opt.name}
                    onChange={(e) =>
                      updateOption(idx, "name", e.target.value)
                    }
                    className="flex-1 border px-2 py-1 rounded"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Extra £"
                    value={opt.price}
                    onChange={(e) =>
                      updateOption(idx, "price", parseFloat(e.target.value) || 0)
                    }
                    className="w-24 border px-2 py-1 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Option
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}