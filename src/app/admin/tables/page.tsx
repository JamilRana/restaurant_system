"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchBar from "@/components/Admin/SearchBar";
import Pagination from "@/components/Pagination";
import { RouteLoader } from "@/components/RouteLoader";
import toast from "react-hot-toast";

type Table = {
  id: number;
  number: string;
  capacity: number;
  location: string | null;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
  currentOrderId: number | null;
  createdAt: string;
};

export default function ManageTables() {
  type ApiResponse = {
    tables: Table[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    stats: {
      total: number;
      available: number;
      occupied: number;
      reserved: number;
      cleaning: number;
    };
  };

  const [data, setData] = useState<ApiResponse | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [editing, setEditing] = useState<Table | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth");
    } else {
      fetchTables(page);
    }
  }, [session, status, router, page, statusFilter, search]);

  const fetchTables = async (pageNum: number) => {
    setLoading(true);
    try {
      let url = `/api/admin/tables?page=${pageNum}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (table: Table) => {
    setEditing(table);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (formData: FormData) => {
    const id = formData.get("id");
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/admin/tables?id=${id}` : "/api/admin/tables";

    const body = {
      number: formData.get("number") as string,
      capacity: parseInt(formData.get("capacity") as string, 10),
      location: formData.get("location") as string,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Table saved successfully");
        fetchTables(page);
        closeModal();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save table");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this table? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/tables?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Table deleted");
        fetchTables(page);
      } else {
        throw new Error("Delete failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete table");
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingStatus(id);
    try {
      const res = await fetch(`/api/admin/tables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: id, status }),
      });

      if (!res.ok) throw new Error("Update failed");

      fetchTables(page);
      toast.success("Table status updated");
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error(err.message || "Failed to update table status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  if (status === "loading") {
    return <RouteLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Reservations Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Tables
            </h1>
            <p className="text-gray-600">
              Manage your restaurant seating layout
            </p>
          </div>
          <Link
            href="/admin/tables/reservation"
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            View Reservations
          </Link>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 min-w-0">
              <SearchBar
                onSearch={setSearch}
                placeholder="Search tables..."
                defaultValue={search}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="RESERVED">Reserved</option>
                <option value="CLEANING">Cleaning</option>
              </select>
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Reset
              </button>
              <button
                onClick={openCreate}
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
                Add Table
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: data?.stats.total || 0 },
            { label: "Available", value: data?.stats.available || 0 },
            { label: "Occupied", value: data?.stats.occupied || 0 },
            { label: "Cleaning", value: data?.stats.cleaning || 0 },
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="text-lg font-semibold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tables Grid with Loading State */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {loading ? (
            // ✅ LOADING STATE
            <div className="col-span-full flex justify-center py-12">
              <div className="flex flex-col items-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading tables...</p>
              </div>
            </div>
          ) : data?.tables.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-5xl mb-3 opacity-40">🪑</div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                No tables found
              </h3>
              <p className="text-gray-500 text-sm">
                Add your first table to get started.
              </p>
            </div>
          ) : (
            data?.tables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                loading={updatingStatus === table.id}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {data?.totalPages && data.totalPages > 1 && (
          <div className="flex justify-center mt-10">
            <Pagination
              page={data.currentPage}
              total={data.totalCount}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {isModalOpen && (
        <TableModal
          table={editing}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// Table Card Component (unchanged)
function TableCard({
  table,
  onEdit,
  onDelete,
  onStatusChange,
  loading,
}: {
  table: Table;
  onEdit: (t: Table) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  loading?: boolean;
}) {
  const statusStyles = {
    AVAILABLE: "text-green-700 bg-green-50 border-green-200",
    OCCUPIED: "text-red-700 bg-red-50 border-red-200",
    RESERVED: "text-yellow-700 bg-yellow-50 border-yellow-200",
    CLEANING: "text-gray-700 bg-gray-100 border-gray-200",
  };

  const statusClass = statusStyles[table.status];

  return (
    <div
      className={`rounded-lg border p-4 text-center bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-default ${statusClass}`}
    >
      {/* Table Number */}
      <div className="text-2xl font-bold text-gray-900 mb-2">
        {table.number}
      </div>

      {/* Capacity */}
      <div className="text-sm text-gray-700 mb-1">
        <span className="font-medium">Seats:</span> {table.capacity}
      </div>

      {/* Location */}
      {table.location && (
        <div
          className="text-xs text-gray-600 mb-3 truncate"
          title={table.location}
        >
          {table.location}
        </div>
      )}

      {/* Status Dropdown */}
      <div className="mb-3">
        <select
          value={table.status}
          onChange={(e) => onStatusChange(table.id, e.target.value)}
          disabled={loading}
          className={`w-full text-xs font-medium px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-gray-400 capitalize ${statusClass}`}
        >
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="RESERVED">Reserved</option>
          <option value="CLEANING">Cleaning</option>
        </select>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        <button
          onClick={() => onEdit(table)}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border border-gray-300 transition-colors"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDelete(table.id)}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded border border-gray-300 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>

      {/* Current Order */}
      {table.currentOrderId && (
        <div className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
          Order #{table.currentOrderId}
        </div>
      )}
    </div>
  );
}

// Table Modal Component with Loading State
function TableModal({
  table,
  onClose,
  onSubmit,
}: {
  table: any;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    number: table?.number || "",
    capacity: table?.capacity || 4,
    location: table?.location || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      if (table?.id) fd.append("id", table.id);
      Object.entries(formData).forEach(([key, value]) => {
        fd.append(key, String(value));
      });
      await onSubmit(fd);
    } catch (err: any) {
      toast.error("Save failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/70">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {table ? "Edit Table" : "Add New Table"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {table ? "Update details" : "Enter new table information"}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Number *
            </label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacity
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Near Window"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : table?.id ? (
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
