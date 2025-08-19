// app/admin/staff/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import StaffModal from "@/components/Admin/StaffModal";
import { RouteLoader } from "@/components/RouteLoader";

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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page
  };

  const goToPage = (pageNum: number) => {
    if (data && pageNum > 0 && pageNum <= data.totalPages) {
      setPage(pageNum);
    }
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

  const openEditModal = (s: Staff) => {
    setEditingStaff(s);
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

    fetchStaff(); // Refresh
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this staff member?")) return;
    await fetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
    fetchStaff();
  };

  if (status === "loading" || loading) {
    <RouteLoader />;
  }
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <a
            href="/admin/users"
            className="bg-blue-600 text-white px-4 py-2 rounded text-center"
          >
            Users
          </a>
          <button
            onClick={openCreateModal}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            + Add Staff
          </button>
          <button
            onClick={exportToCSV}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search staff..."
          value={search}
          onChange={handleSearch}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      {/* Total */}
      <div className="mb-4 text-gray-600">
        Total: <strong>{data?.totalCount || 0}</strong> staff member(s)
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow rounded-lg border">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Hire Date</th>
              <th className="px-4 py-3 text-left">Pay</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No staff found matching your search.
                </td>
              </tr>
            ) : (
              data?.staff.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.role}</td>
                  <td className="px-4 py-3">
                    <div>{s.email}</div>
                    <div>{s.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(s.hireDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {s.salary
                      ? `£${s.salary}/${s.salaryPeriod?.toLowerCase()}`
                      : s.hourlyRate
                      ? `£${s.hourlyRate}/hour`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{s.active ? "✅" : "❌"}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => openEditModal(s)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
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

      {/* Pagination */}
      {data?.totalPages ? (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {data.totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === data.totalPages}
            className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}

      {/* Modal */}
      {isModalOpen && (
        <StaffModal
          staff={editingStaff}
          onClose={closeModal}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
