// app/admin/promocodes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PromoCodeModal from "@/components/Admin/PromoCodeModal";
import SearchBar from "@/components/Admin/SearchBar";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";

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
  const {  data:session, status } = useSession();
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

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      fetchPromoCodes(page);
    }
  }, [session, status, router, page]);

  const fetchPromoCodes = async (pageNum: number) => {
    setLoading(true);
    try {
      const url = new URL(`/api/admin/promocodes`, window.location.origin);
      url.searchParams.append("page", String(pageNum));
      url.searchParams.append("limit", String(limit));
      if (search) url.searchParams.append("search", search);
      if (dateFrom) url.searchParams.append("dateFrom", dateFrom);
      if (dateTo) url.searchParams.append("dateTo", dateTo);

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

    fetchPromoCodes(page); // Refetch current page
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this promo code? This cannot be undone.")) return;
    await fetch(`/api/admin/promocodes?id=${id}`, { method: "DELETE" });
    fetchPromoCodes(page);
  };

  if (status === "loading" || loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promo Code Management</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add Promo Code
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Filters */}
      <div className="bg-white p-4 border rounded-lg mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
        <div>
          <SearchBar onSearch={setSearch} placeholder="Search by code..." />
        </div>
        <div className="col-span-2">
          <DateRangePicker
            value={{ startDate: dateFrom ? new Date(dateFrom) : null, endDate: dateTo ? new Date(dateTo) : null }}
            onChange={({ startDate, endDate }) => {
              setDateFrom(startDate.toISOString().split("T")[0]);
              setDateTo(endDate.toISOString().split("T")[0]);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Issue Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Discount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Min Order</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Uses</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Expires</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Active</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.promos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No promo codes found.
                </td>
              </tr>
            ) : (
              data?.promos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.code}</td>
                  <td className="px-4 py-3 text-sm">
                    {p.discountPercent ? `${p.discountPercent}%` : ""}
                    {p.discountAmount ? `£${p.discountAmount.toFixed(2)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.minOrderAmount ? `£${p.minOrderAmount.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.currentUses}/{p.maxUses ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        p.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:underline"
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
      {data?.totalPages && data.totalPages > 1 && (
        <Pagination
          page={data.currentPage}
          total={data.totalCount}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <PromoCodeModal
          promo={editing}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}