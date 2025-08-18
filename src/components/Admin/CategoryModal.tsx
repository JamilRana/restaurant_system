// app/components/Admin/CategoryModal.tsx
"use client";

import { useState, useEffect } from "react";

interface Category {
  id?: number;
  name: string;
  image?: string | null;
}

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function CategoryModal({ category, onClose, onSubmit }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(category?.name || "");
    setImagePreview(category?.image || null);
    setImageFile(null);
  }, [category]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (category?.id) formData.append("id", String(category.id));
      if (imageFile) formData.append("image", imageFile);

      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {category?.id ? "Edit Category" : "Create Category"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image (JPG, PNG, WebP, ≤5MB)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="w-full"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt={name || "Preview"}
                  className="h-24 rounded object-cover"
                />
              </div>
            )}
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
              {isSubmitting ? "Saving..." : category?.id ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}