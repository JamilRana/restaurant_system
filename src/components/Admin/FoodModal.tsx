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
  image: string | null;
  price: number;
  categoryId: number;
  available: boolean;
  options: FoodOption[];
};

type FoodModalProps = {
  food: Food | null;
  categoryId?: number;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<any>;
};

export default function FoodModal({
  food,
  categoryId,
  onClose,
  onSubmit,
}: FoodModalProps) {
  const [name, setName] = useState(food?.name || "");
  const [description, setDescription] = useState(food?.description || "");
  const [price, setPrice] = useState<string>(food?.price?.toString() || "");
  const [selectedCategoryId, setCategoryId] = useState<string>(
    (food?.categoryId || categoryId)?.toString() || ""
  );
  const [available, setAvailable] = useState<boolean>(food?.available ?? true);
  const [image, setImage] = useState<File | null>(null);
  const [options, setOptions] = useState<FoodOption[]>(food?.options || []);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load categories on mount
  useEffect(() => {
    let isMounted = true;

    const fetchCats = async () => {
      try {
        const res = await fetch("/api/admin/category");
        if (!res.ok) throw new Error("Failed to load categories");
        const data = await res.json();

        // ✅ Extract categories from the paginated response
        let categoryList: { id: number; name: string }[] = [];

        if (data.categories && Array.isArray(data.categories)) {
          categoryList = data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
          }));
        }

        if (isMounted) {
          setCategories(categoryList);

          // Only set if no category is pre-selected
          if (!selectedCategoryId && food) {
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
  }, [food, selectedCategoryId]);

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
        if (field === "price") {
          const numValue =
            typeof value === "string" ? parseFloat(value) : value;
          return { ...opt, price: isNaN(numValue) ? 0 : numValue };
        }
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
    formData.append("categoryId", selectedCategoryId);
    formData.append("available", available.toString());
    if (image) formData.append("image", image);

    options.forEach((opt, idx) => {
      if (opt.name.trim()) {
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/70">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {food ? "Edit Food Item" : "Add New Food Item"}
            </h2>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe the dish (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="available"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="available"
                className="text-sm font-medium text-slate-700"
              >
                Available for order
              </label>
            </div>

            <div className="hidden">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Image (optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-300 hover:border-slate-400"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) setImage(file);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <svg
                    className="w-8 h-8 text-slate-400 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6.058A4 4 0 0116 16h-2m-5.938 0a7.001 7.001 0 00-2.062 0H7"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </label>
              </div>
              {image && (
                <div className="mt-3 relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              {food?.image && !image && (
                <div className="mt-3">
                  <img
                    src={food.image}
                    alt="Current"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">Current image</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Options (e.g., Spicy, Large)
              </label>
              {options.length === 0 ? (
                <p className="text-slate-500 text-sm mb-3 italic">
                  No options added
                </p>
              ) : (
                <div className="space-y-3 mb-3">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Option name"
                        value={opt.name}
                        onChange={(e) =>
                          updateOption(idx, "name", e.target.value)
                        }
                        className="flex-1 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Extra £"
                        value={isNaN(opt.price) ? "" : opt.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateOption(
                            idx,
                            "price",
                            val === "" ? 0 : parseFloat(val || "0")
                          );
                        }}
                        className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-red-600 hover:text-red-800 font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-red-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addOption}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs">
                  +
                </span>
                Add Option
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200/70 bg-slate-50/30">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
            >
              {loading ? "Saving..." : food ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
