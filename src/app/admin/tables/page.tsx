// app/admin/tables/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/Admin/SearchBar";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";

type Table = {
  id: number;
  number: string;
  capacity: number;
  location: string | null;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";
  currentOrderId: number | null;
  createdAt: string;
};

type DateRange = { startDate: Date | null; endDate: Date | null };

export default function ManageTables() {
  const {  data:session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{
    tables: Table[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null>(null);
  const [editing, setEditing] = useState<Table | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/login");
    } else {
      fetchTables(page);
    }
  }, [session, status, router, page, statusFilter, search, dateRange]);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables(page);
  }, [page, statusFilter, search, dateRange]);

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

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchTables(page);
      closeModal();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this table?")) return;
    await fetch(`/api/admin/tables?id=${id}`, { method: "DELETE" });
    fetchTables(page);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/admin/tables/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: id, status }),
    });
    fetchTables(page);
  };

  const handleDateChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange({ startDate: range.startDate, endDate: range.endDate });
    setPage(1);
  };
  // Get next logical status (cycle: AVAILABLE → OCCUPIED → CLEANING → AVAILABLE)
const getNextStatus = (current: string) => {
  const cycle = ["AVAILABLE", "OCCUPIED", "CLEANING", "AVAILABLE"];
  const index = cycle.indexOf(current);
  return cycle[index + 1] || cycle[0];
};

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateRange({ startDate: null, endDate: null });
    setPage(1);
  };

  if (status === "loading" || loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Tables</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Table
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="md:w-1/2">
          <SearchBar onSearch={setSearch} placeholder="Search by table number..." />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="CLEANING">Cleaning</option>
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Tables Grid */}
<div className="mt-6">
  <div className="flex flex-wrap gap-3 justify-center">
    {data?.tables.length === 0 ? (
      <p className="text-gray-500 text-center w-full py-8">No tables found.</p>
    ) : (
      data?.tables.map((table) => {
        // Status-based styling
        const statusStyles = {
          AVAILABLE: "bg-green-100 border-green-300 hover:bg-green-200",
          OCCUPIED: "bg-red-100 border-red-300 hover:bg-red-200",
          RESERVED: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
          CLEANING: "bg-gray-100 border-gray-300 hover:bg-gray-200",
        };

        const statusColors = {
          AVAILABLE: "text-green-800",
          OCCUPIED: "text-red-800",
          RESERVED: "text-yellow-800",
          CLEANING: "text-gray-800",
        };

        return (
          <div
            key={table.id}
            className={`
              w-48 p-4 border-4 rounded-lg shadow-md text-center
              transform transition-all duration-200 hover:scale-105 cursor-pointer
              ${statusStyles[table.status]}
            `}
            title={`Table ${table.number} - ${table.status}`}
          >
            {/* Table Number */}
            <div className="text-3xl font-bold mb-2 text-gray-800">
              {table.number}
            </div>

            {/* Capacity */}
            <div className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Seats:</span> {table.capacity}
            </div>

            {/* Location */}
            {table.location && (
              <div className="text-xs text-gray-500 mb-2 truncate" title={table.location}>
                {table.location}
              </div>
            )}

            {/* Status Badge */}
            <div
              className={`
                text-xs font-bold px-2 py-1 rounded-full mb-3
                ${statusColors[table.status]}
                ${table.status === "AVAILABLE" && "bg-green-200"}
                ${table.status === "OCCUPIED" && "bg-red-200"}
                ${table.status === "RESERVED" && "bg-yellow-200"}
                ${table.status === "CLEANING" && "bg-gray-200"}
              `}
            >
              {table.status.replace("_", " ")}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(table);
                }}
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-white bg-opacity-50 rounded"
                title="Edit Table"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(table.id, getNextStatus(table.status));
                }}
                className="text-white text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded"
                title={`Set to ${getNextStatus(table.status)}`}
              >
                ➡️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(table.id);
                }}
                className="text-white text-xs px-2 py-1 bg-red-500 hover:bg-red-600 rounded"
                title="Delete Table"
              >
                🗑️
              </button>
            </div>

            {/* Current Order ID (if any) */}
            {table.currentOrderId && (
              <div className="mt-2 text-xs text-blue-700 font-medium">
                Order #{table.currentOrderId}
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
</div>

      {data?.totalPages && data.totalPages > 1 && (
        <Pagination
          page={data.currentPage}
          total={data.totalCount}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {isModalOpen && (
        <TableModal table={editing} onClose={closeModal} onSubmit={handleSubmit} />
      )}
    </div>
  );
}

function TableModal({ table, onClose, onSubmit }: {
  table: any;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    number: table?.number || "",
    capacity: table?.capacity || 4,
    location: table?.location || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    if (table?.id) fd.append("id", table.id);
    Object.entries(formData).forEach(([key, value]) => {
      fd.append(key, String(value));
    });
    onSubmit(fd);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{table ? "Edit" : "Add"} Table</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Table Number *</label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label>Capacity</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label>Location (e.g., Indoor, Outdoor)</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}