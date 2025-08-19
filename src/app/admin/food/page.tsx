// app/admin/foods/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FoodModal from "@/components/Admin/FoodModal";
import { RouteLoader } from "@/components/RouteLoader";

type FoodOption = {
  name: string;
  price: number;
};

type Food = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
  categoryId: number;
  categoryName: string;
  options: FoodOption[];
  createdAt: string;
};

type ApiResponse = {
  foods: Food[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export default function ManageFoods() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [filtered, setFiltered] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/Auth");
    } else {
      fetchFoods(page);
    }
  }, [session, status, router, page]);

  const fetchFoods = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/food?page=${pageNum}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result: ApiResponse = await res.json();
      setData(result);
      setFiltered(result.foods);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data) {
      setFiltered(
        data.foods.filter(
          (f) =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.categoryName.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, data]);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (food: Food) => {
    setEditing(food);
    setIsModalOpen(true);
  };

  const close = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const goToPage = (pageNum: number) => {
    if (data && pageNum > 0 && pageNum <= data.totalPages) {
      setPage(pageNum);
    }
  };

  const submit = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/admin/food";

    const res = await fetch(url, { method, body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }
    fetchFoods(page);
    return await res.json();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this food item? This cannot be undone.")) return;
    await fetch(`/api/admin/food?id=${id}`, { method: "DELETE" });
    fetchFoods(page);
  };

  if (status === "loading" || loading) {
    <RouteLoader />;
  }
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Food Items</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add Food
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name or category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border px-3 py-2 rounded mb-4"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Available</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No food items found.
                </td>
              </tr>
            ) : (
              filtered.map((food) => (
                <tr key={food.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    {food.image ? (
                      <img
                        src={food.image}
                        alt={food.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{food.name}</div>
                    {food.options.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {food.options.map((opt, idx) => (
                          <div key={idx}>
                            {opt.name}
                            {opt.price > 0 && (
                              <span className="text-green-600 ml-1">
                                +£{opt.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {food.categoryName}
                  </td>
                  <td className="px-4 py-3">£{food.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        food.available
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {food.available ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => openEdit(food)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(food.id)}
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
        <FoodModal food={editing} onClose={close} onSubmit={submit} />
      )}
    </div>
  );
}
