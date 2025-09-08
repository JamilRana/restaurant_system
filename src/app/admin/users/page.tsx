// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserModal from "@/components/Admin/UserModal";
import SearchBar from "@/components/Admin/SearchBar";
import Pagination from "@/components/Pagination";
import { RouteLoader } from "@/components/RouteLoader";
import { User, ApiResponse } from "@/types";

export default function UserManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      fetchUsers();
    }
  }, [session, status, router, search, page, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/users", window.location.origin);
      url.searchParams.set("search", search);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));
      if (statusFilter !== "ALL") {
        url.searchParams.set(
          "active",
          statusFilter === "ACTIVE" ? "true" : "false"
        );
      }

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load users");

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError("Could not load users: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (formData: any) => {
    const method = formData.id ? "PUT" : "POST";
    const url = "/api/admin/users";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }

    fetchUsers();
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    setUpdatingStatus(id);

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      fetchUsers(); // Refresh data
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to update user status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (status === "loading") {
    return <RouteLoader />;
  }

  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            User Management
          </h1>
          <p className="text-slate-600">Manage user accounts and permissions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative flex-1">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder="Search by email, name..."
                  defaultValue={search}
                />
              </div>

              <button
                onClick={openCreateModal}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 font-medium"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add User
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Total Users</div>
                <div className="text-2xl font-bold text-slate-800">
                  {data?.totalCount || 0}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Active</div>
                <div className="text-2xl font-bold text-green-600">
                  {data?.users?.filter((u) => u.staff?.active !== false)
                    .length || 0}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Staff Users</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {data?.users?.filter((u) => u.role === "STAFF").length || 0}
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="mt-4 text-slate-600">Loading users...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-red-600">{error}</div>
                </div>
              ) : !data || !data.users || data.users.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-slate-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    No users found
                  </h3>
                  <p className="text-slate-500">
                    Create your first user account to manage access
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {data.users.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">
                              {u.staff?.name || u.customer?.name || "N/A"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {u.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900 capitalize">
                              {u.role.toLowerCase()}
                            </div>
                            {u.staff && (
                              <div className="text-xs text-slate-500">
                                {u.staff.role}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {u.customer?.phone || u.staff?.name || "—"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {u.customer?.address || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleActive(
                                    u.id,
                                    u.staff?.active !== false
                                  )
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${
                                  u.staff?.active !== false
                                    ? "bg-indigo-600"
                                    : "bg-slate-300"
                                }`}
                                aria-label={
                                  u.staff?.active !== false
                                    ? "Deactivate user"
                                    : "Activate user"
                                }
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    u.staff?.active !== false
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              </button>
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                  u.staff?.active !== false
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-red-100 text-red-800 border border-red-200"
                                }`}
                              >
                                {u.staff?.active !== false
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(u)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                aria-label="Edit user"
                              >
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                aria-label="Delete user"
                              >
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {data?.totalPages && data.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  page={page}
                  total={data.totalCount}
                  limit={limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 sticky top-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                User Management
              </h2>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">Add Users</div>
                    <div>Create user accounts</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">
                      Edit & Delete
                    </div>
                    <div>Manage existing users</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-lg">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-15a2 2 0 00-2-2H6a2 2 0 00-2 2v17m0 0v1a2 2 0 002 2h12a2 2 0 002-2v-1m-6 0H9"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">
                      Permissions
                    </div>
                    <div>Control access levels</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl">
                <div className="text-sm font-medium text-indigo-800 mb-1">
                  Total User Accounts
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {data?.totalCount || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <UserModal
            user={editingUser}
            onClose={closeModal}
            onSubmit={handleSave}
          />
        )}
      </div>
    </div>
  );
}
