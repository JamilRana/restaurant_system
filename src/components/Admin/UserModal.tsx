// app/components/Admin/UserModal.tsx
"use client";

import { useState, useEffect } from "react";

interface User {
  id?: number;
  email?: string;
  role?: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
  password?: string;
}

interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}

function UserModal({ user, onClose, onSubmit }: UserModalProps) {
  const [formData, setFormData] = useState({
    email: user?.email ?? "",
    role: user?.role ?? "CUSTOMER",
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    postcode: user?.postcode ?? "",
    password: "",
  });

  // Sync form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email ?? "",
        role: user.role ?? "CUSTOMER",
        name: user.name ?? "",
        phone: user.phone ?? "",
        address: user.address ?? "",
        postcode: user.postcode ?? "",
        password: user.password ?? "",
      });
    } else {
      setFormData({
        email: "",
        role: "CUSTOMER",
        name: "",
        phone: "",
        address: "",
        postcode: "",
        password: "",
      });
    }
  }, [user]);

  useEffect(() => {
    console.log("Form Data: ", formData);
  }, [formData]); // This logs the formData every time it changes

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formDataObj = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        formDataObj.append(key, value);
      }
    });

    onSubmit(formDataObj);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {user?.id ? "Edit User" : "Create New User"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password {user?.id ? "(Leave blank to keep current)" : ""}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={user?.id ? "New password (optional)" : "Password"}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              required
              value={formData.role}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">postcode</label>
            <input
              type="text"
              name="postcode"
              value={formData.postcode}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {user?.id ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
