// app/admin/users/page.tsx
"use client";

import UserModal from "@/components/Admin/UserModal";
import { RouteLoader } from "@/components/RouteLoader";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Customer = {
  name: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
};

type User = {
  id: number;
  email: string;
  role: "CUSTOMER" | "KITCHEN" | "WAITER" | "ADMIN";
  createdAt: string;
  customer: Customer | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
  password?: string;
};

export default function ManageUsers() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<
    (User & { password?: string }) | null
  >(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/Auth");
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        alert("Failed to load users: " + (data.error || "Unknown error"));
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Search & Filter Logic
  useEffect(() => {
    let result = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.customer?.name?.toLowerCase().includes(term) ||
          u.customer?.phone?.includes(term)
      );
    }

    if (filterRole) {
      result = result.filter((u) => u.role === filterRole);
    }

    setFilteredUsers(result);
  }, [searchTerm, filterRole, users]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser({
      ...user,
      name: user.customer?.name ?? "",
      phone: user.customer?.phone ?? "",
      address: user.customer?.address ?? "",
      postcode: user.customer?.postcode ?? "",
      password: "",
    });
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (formData: FormData) => {
    const method = formData.get("id") ? "PUT" : "POST";
    const url = "/api/admin/users";

    const body: any = {};
    formData.forEach((value, key) => {
      if (value) body[key] = value;
    });

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alert(`User ${formData.get("id") ? "updated" : "created"} successfully!`);
      closeModal();
      fetchUsers();
    } else {
      const error = await res.json();
      alert(`Error: ${error.error || "Failed to save user"}`);
    }
  };

  if (status === "loading" || loading) {
    <RouteLoader />;
  }
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by email, name, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="KITCHEN">Kitchen</option>
          <option value="ADMIN">Admin</option>
        </select>
        <div className="text-sm text-gray-500">
          {filteredUsers.length} user(s) found
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full
                      ${
                        user.role === "ADMIN"
                          ? "bg-red-100 text-red-800"
                          : user.role === "KITCHEN"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">{user.customer?.name || "-"}</td>
                  <td className="px-4 py-2">{user.customer?.phone || "-"}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <UserModal
          user={editingUser}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
