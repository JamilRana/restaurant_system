// app/admin/delivery-zones/page.tsx
"use client";

import { useEffect, useState } from "react";
import ZoneModal from "@/components/Admin/ZoneModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RouteLoader } from "@/components/RouteLoader";
import Pagination from "@/components/Pagination";

type DeliveryZone = {
  id: number;
  postcode: string;
  deliveryFee: number;
};

type ApiResponse = {
  zones: DeliveryZone[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export default function ManageZones() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalCount, setTotalCount] = useState(1);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/Auth");
    } else {
      fetchZones(page);
    }
  }, [session, status, router, page]);

  const fetchZones = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/delivery-zones?page=${pageNum}&limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to fetch");

      const result: ApiResponse = await res.json();
      setData(result);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchZones(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openCreateModal = () => {
    setEditingZone(null);
    setIsModalOpen(true);
  };

  const openEditModal = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
  };

  const handleSubmit = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/admin/delivery-zones";

    const body = JSON.stringify({
      id: isEdit ? Number(formData.get("id")) : undefined,
      postcode: formData.get("postcode"),
      deliveryFee: Number(formData.get("deliveryFee")),
    });

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }

    fetchZones(page);
    return await res.json();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this delivery zone? This cannot be undone.")) return;
    await fetch(`/api/admin/delivery-zones?id=${id}`, { method: "DELETE" });
    fetchZones(page);
  };

  if (status === "loading") {
    return <RouteLoader />;
  }

  // Filter zones based on search
  const filteredZones =
    data?.zones.filter((z) =>
      z.postcode.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Delivery Zones
          </h1>
          <p className="text-slate-600">Manage delivery areas and fees</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by postcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 placeholder-slate-500"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <button
                onClick={openCreateModal}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 font-medium"
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
                Add Delivery Zone
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Total Zones</div>
                <div className="text-2xl font-bold text-slate-800">
                  {totalCount}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">
                  Search Results
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredZones.length}
                </div>
              </div>
            </div>

            {/* Zones List */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="mt-4 text-slate-600">
                    Loading delivery zones...
                  </p>
                </div>
              ) : filteredZones.length === 0 ? (
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
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    No delivery zones found
                  </h3>
                  <p className="text-slate-500">
                    Create your first delivery zone to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Postcode
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Delivery Fee
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredZones.map((zone) => (
                        <tr
                          key={zone.id}
                          className="hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900 uppercase">
                              {zone.postcode}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-900">
                              £{zone.deliveryFee}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(zone)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                aria-label="Edit zone"
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
                                onClick={() => handleDelete(zone.id)}
                                className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                aria-label="Delete zone"
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
                  total={totalCount}
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
                Zone Management
              </h2>
              <div className="space-y-4 text-sm text-slate-600">
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">Add Zones</div>
                    <div>Define delivery areas</div>
                  </div>
                </div>
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">
                      Edit & Delete
                    </div>
                    <div>Manage existing zones</div>
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">
                      Search & Filter
                    </div>
                    <div>Find zones quickly</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl">
                <div className="text-sm font-medium text-indigo-800 mb-1">
                  Total Delivery Zones
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {totalCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <ZoneModal
            zone={editingZone}
            onClose={closeModal}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
