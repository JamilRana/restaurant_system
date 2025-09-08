// app/admin/promocodes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PromoCodeModal from "@/components/Admin/PromoCodeModal";
import SearchBar from "@/components/Admin/SearchBar";
import Pagination from "@/components/Pagination";
import { RouteLoader } from "@/components/RouteLoader";
import ToggleButton from "@/components/Admin/ToggleButton";

type PromoCode = {
  id: number;
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  restaurantId: number | null;
};

type ApiResponse = {
  promos: PromoCode[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export default function AdminPromoCodes() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      fetchPromoCodes(page);
    }
  }, [session, status, router, page]);

  // app/admin/promocodes/page.tsx
  // Update the fetchPromoCodes function to include active filter
  const fetchPromoCodes = async (pageNum: number) => {
    setLoading(true);
    try {
      const url = new URL(`/api/admin/promocodes`, window.location.origin);
      url.searchParams.append("page", String(pageNum));
      url.searchParams.append("limit", String(limit));
      if (search) url.searchParams.append("search", search);
      if (dateFrom) url.searchParams.append("dateFrom", dateFrom);
      if (dateTo) url.searchParams.append("dateTo", dateTo);

      // Add active filter based on search
      if (search.includes("active:yes") || search.includes("active:true")) {
        url.searchParams.append("active", "true");
      } else if (
        search.includes("active:no") ||
        search.includes("active:false")
      ) {
        url.searchParams.append("active", "false");
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load");

      const result: ApiResponse = await res.json();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPromoCodes(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, dateFrom, dateTo]);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditing(promo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setError("");
  };

  const handleSubmit = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit
      ? `/api/admin/promocodes?id=${formData.get("id")}`
      : "/api/admin/promocodes";

    const res = await fetch(url, { method, body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }

    fetchPromoCodes(page);
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this promo code? This cannot be undone.")) return;
    await fetch(`/api/admin/promocodes?id=${id}`, { method: "DELETE" });
    fetchPromoCodes(page);
  };

  const handleToggleAvailability = async (
    id: number,
    currentStatus: boolean
  ) => {
    setUpdatingStatus(id);

    try {
      const res = await fetch(`/api/admin/promocodes/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const updated = await res.json();

      setData((prev) =>
        prev
          ? {
              ...prev,
              promos: prev.promos.map((promo) =>
                promo.id === id ? { ...promo, active: updated.active } : promo
              ),
            }
          : null
      );
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to update promo code status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  if (status === "loading" || loading) {
    return <RouteLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Promo Codes</h1>
              <p className="text-slate-600 text-sm">
                Manage discounts and promotions
              </p>
            </div>
            <button
              onClick={openCreate}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 text-sm font-medium whitespace-nowrap w-full sm:w-auto"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Promo Code
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-4 mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  onSearch={setSearch}
                  placeholder="Search by code..."
                  defaultValue={search}
                />
              </div>

              {/* Date Range Picker */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {(search || dateFrom || dateTo) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}

              {/* Active/Inactive Filter Chips */}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() =>
                    setSearch((prev) =>
                      prev.includes("active:")
                        ? prev.replace("active:", "")
                        : "active:yes"
                    )
                  }
                  className={`text-xs px-2 py-1 rounded-full ${
                    search.includes("active:yes")
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() =>
                    setSearch((prev) =>
                      prev.includes("active:")
                        ? prev.replace("active:", "")
                        : "active:no"
                    )
                  }
                  className={`text-xs px-2 py-1 rounded-full ${
                    search.includes("active:no")
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Stats - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-4 text-center sm:text-left">
              <div className="text-xs text-slate-600 mb-1">Total Codes</div>
              <div className="text-xl font-bold text-slate-800">
                {data?.totalCount || 0}
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-4 text-center sm:text-left">
              <div className="text-xs text-slate-600 mb-1">Active</div>
              <div className="text-xl font-bold text-green-600">
                {data?.promos.filter((p) => p.active).length || 0}
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-xl p-4 text-center sm:text-left">
              <div className="text-xs text-slate-600 mb-1">Usage</div>
              <div className="text-xl font-bold text-indigo-600">
                {data?.promos.reduce((acc, p) => acc + p.currentUses, 0) || 0}
              </div>
            </div>
          </div>

          {/* Promo Codes */}
          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-slate-600">Loading promo codes...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-600">{error}</div>
              </div>
            ) : !data || data.promos.length === 0 ? (
              <div className="p-8 text-center">
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
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  No promo codes found
                </h3>
                <p className="text-slate-500 text-sm">
                  Create your first promo code to offer discounts
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Min Order
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Uses
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.promos.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono text-sm font-bold text-slate-900">
                            {p.code}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {p.discountPercent && (
                              <span>{p.discountPercent}%</span>
                            )}
                            {p.discountAmount && (
                              <span>£{p.discountAmount}</span>
                            )}
                            {p.discountPercent && p.discountAmount && (
                              <span> or </span>
                            )}
                            {!p.discountPercent && !p.discountAmount && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {p.minOrderAmount ? `£${p.minOrderAmount}` : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {p.currentUses}/{p.maxUses ?? "∞"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {p.expiresAt
                              ? new Date(p.expiresAt).toLocaleDateString()
                              : "No expiry"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ToggleButton
                              value={p.active}
                              onToggle={() =>
                                handleToggleAvailability(p.id, p.active)
                              }
                              loading={updatingStatus === p.id}
                            />
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                p.active
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              {p.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              aria-label="Edit promo code"
                              disabled={updatingStatus !== null}
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
                              onClick={() => handleDelete(p.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                              aria-label="Delete promo code"
                              disabled={updatingStatus !== null}
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
            <div className="mt-6 flex justify-center">
              <Pagination
                page={page}
                total={data.totalCount}
                limit={limit}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <PromoCodeModal
            promo={editing}
            onClose={closeModal}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
