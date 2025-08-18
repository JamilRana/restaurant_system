// app/admin/delivery-zones/page.tsx
"use client";

import { useEffect, useState } from "react";
import ZoneModal from "@/components/Admin/ZoneModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const [filteredZones, setFilteredZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

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
      const res = await fetch(`/api/admin/delivery-zones?page=${pageNum}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const result: ApiResponse = await res.json();
      setData(result);
      setFilteredZones(result.zones);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Failed to load zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      setFilteredZones(
        data.zones.filter((z) =>
          z.postcode.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, data]);

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

  const goToPage = (pageNum: number) => {
    if (data && pageNum > 0 && pageNum <= data.totalPages) {
      setPage(pageNum);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/admin/delivery-zones";

    const res = await fetch(url, { method, body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }
    fetchZones(page);
    return await res.json();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this delivery zone?")) return;
    await fetch(`/api/admin/delivery-zones?id=${id}`, { method: "DELETE" });
    fetchZones(page);
  };

  if (status === "loading" || loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Delivery Zones</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Zone
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by postcode..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-4"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Postcode</th>
              <th className="px-4 py-2 text-left">Delivery Fee</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredZones.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No zones found.
                </td>
              </tr>
            ) : (
              filteredZones.map((zone) => (
                <tr key={zone.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{zone.postcode}</td>
                  <td className="px-4 py-2">£{zone.deliveryFee.toFixed(2)}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => openEditModal(zone)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
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

      {data?.totalPages && data.totalPages > 1 && (
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
      )}

      {isModalOpen && (
        <ZoneModal zone={editingZone} onClose={closeModal} onSubmit={handleSubmit} />
      )}
    </div>
  );
}