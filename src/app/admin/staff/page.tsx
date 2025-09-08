// app/admin/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import StaffModal from "@/components/Admin/StaffModal";
import SearchBar from "@/components/Admin/SearchBar";
import { RouteLoader } from "@/components/RouteLoader";
import Pagination from "@/components/Pagination";
import ToggleButton from "@/components/Admin/ToggleButton";
import toast from "react-hot-toast";

type Staff = {
  id: number;
  name: string;
  role:
    | "CHEF"
    | "WAITER"
    | "MANAGER"
    | "CASHIER"
    | "DELIVERY"
    | "CLEANER"
    | "OTHER";
  email: string | null;
  phone: string | null;
  hireDate: string;
  salary: number | null;
  hourlyRate: number | null;
  salaryPeriod: "HOURLY" | "WEEKLY" | "MONTHLY" | null;
  active: boolean;
  userId: number | null;
};

type ApiResponse = {
  staff: Staff[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export default function StaffManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const limit = 10;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      fetchStaff();
    }
  }, [session, status, router, search, page]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/staff", window.location.origin);
      url.searchParams.set("search", search);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load staff");

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError("Could not load staff data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const exportToCSV = () => {
    if (!data?.staff.length) return;

    const headers = [
      "Name",
      "Role",
      "Email",
      "Phone",
      "Hire Date",
      "Salary",
      "Hourly Rate",
      "Period",
      "Active",
    ];
    const rows = data.staff.map((s) => [
      s.name,
      s.role,
      s.email || "",
      s.phone || "",
      new Date(s.hireDate).toLocaleDateString(),
      s.salary ? `£${s.salary}` : "",
      s.hourlyRate ? `£${s.hourlyRate}` : "",
      s.salaryPeriod || "",
      s.active ? "Yes" : "No",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `staff-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: Staff) => {
    const sanitizedStaff = {
      ...staff,
      salary: staff.salary === null ? null : Number(staff.salary),
      hourlyRate: staff.hourlyRate === null ? null : Number(staff.hourlyRate),
      hireDate: staff.hireDate
        ? new Date(staff.hireDate).toISOString().split("T")[0]
        : "",
    };

    // Debug
    console.log("Sanitized for edit:", sanitizedStaff);
    console.log("typeof salary:", typeof sanitizedStaff.salary); // Should be "number" or "object" (if null)

    setEditingStaff(sanitizedStaff);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const handleSave = async (formData: any) => {
    const method = formData.id ? "PUT" : "POST";
    const url = "/api/admin/staff";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }

    fetchStaff();
    closeModal();
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    setUpdatingStatus(id);

    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      fetchStaff();
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to update user status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this staff member? This cannot be undone.")) return;
    await fetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
    fetchStaff();
  };

  const handleCreateUser = async (staff: Staff) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: staff.name,
          email: staff.email,
          role: "STAFF",
          staffId: Number(staff.id),
          password: "123456",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Failed to create user");
      }

      fetchStaff();
      toast.success(`User account created for ${staff.name}`);
    } catch (err: any) {
      console.error("Create user error:", err);
      toast.error(`Failed to create user: ${err.message}`);
    }
  };

  if (status === "loading" || loading) {
    return <RouteLoader />;
  }

  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Staff Management
          </h1>
          <p className="text-slate-600">
            Manage your restaurant team members and their access
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative flex-1">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder="Search by name, role, email..."
                  defaultValue={search}
                />
              </div>

              <div className="flex flex-wrap gap-3">
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
                  Add Staff
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 font-medium"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Total Staff</div>
                <div className="text-2xl font-bold text-slate-800">
                  {data?.totalCount || 0}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Active</div>
                <div className="text-2xl font-bold text-green-600">
                  {data?.staff.filter((s) => s.active).length || 0}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">
                  With User Accounts
                </div>
                <div className="text-2xl font-bold text-indigo-600">
                  {data?.staff.filter((s) => s.userId).length || 0}
                </div>
              </div>
            </div>

            {/* Staff List */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="mt-4 text-slate-600">Loading staff...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-red-600">{error}</div>
                </div>
              ) : !data || data.staff.length === 0 ? (
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
                    No staff members found
                  </h3>
                  <p className="text-slate-500">
                    Add your first staff member to manage your restaurant team
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Staff Member
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Hire Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Pay
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
                      {data.staff.map((s) => (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">
                              {s.name}
                            </div>
                            {s.userId && (
                              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                User account created
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900 font-medium capitalize">
                              {s.role.toLowerCase()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {s.email || "— "}
                            </div>
                            <div className="text-sm text-slate-500">
                              {s.phone || "— "}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {new Date(s.hireDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {s.salary
                                ? `£${s.salary}/${(
                                    s.salaryPeriod || ""
                                  ).toLowerCase()}`
                                : s.hourlyRate
                                ? `£${s.hourlyRate}/hour`
                                : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <ToggleButton
                                value={s.active}
                                onToggle={() =>
                                  handleToggleActive(s.id, s.active)
                                }
                                loading={updatingStatus === s.id}
                              />
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                  s.active
                                    ? "bg-green-100 text-green-800 border border-green-200"
                                    : "bg-red-100 text-red-800 border border-red-200"
                                }`}
                              >
                                {s.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => openEditModal(s)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                                aria-label="Edit staff"
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
                                Edit
                              </button>
                              {!s.userId && (
                                <button
                                  onClick={() => handleCreateUser(s)}
                                  className="text-indigo-600 hover:text-indigo-800 p-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                                  aria-label="Create user"
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
                                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                    />
                                  </svg>
                                  Create User
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm"
                                aria-label="Delete staff"
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
                                Delete
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
        </div>

        {/* Modal */}
        {isModalOpen && (
          <StaffModal
            staff={editingStaff}
            onClose={closeModal}
            onSubmit={handleSave}
          />
        )}
      </div>
    </div>
  );
}
