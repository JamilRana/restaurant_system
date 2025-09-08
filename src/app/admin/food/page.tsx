// app/admin/foods/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FoodModal from "@/components/Admin/FoodModal";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/Admin/SearchBar";
import { Decimal } from "@prisma/client/runtime/library";
import { RouteLoader } from "@/components/RouteLoader";
import ToggleButton from "@/components/Admin/ToggleButton";
import toast from "react-hot-toast";

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

export default function ManageFoodsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalCount, setTotalCount] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/Auth");
      return;
    }
  }, [session, status, router]);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/food?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const result: ApiResponse = await res.json();
      setData(result);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when page changes
  useEffect(() => {
    fetchFoods();
  }, [page]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchFoods();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

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

  const submit = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/admin/food";

    const res = await fetch(url, { method, body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }
    fetchFoods(); // Refresh with current filters
    return await res.json();
  };

  const handleToggleAvailability = async (
    foodId: number,
    currentStatus: boolean
  ) => {
    try {
      setUpdatingStatus(foodId);
      const res = await fetch(`/api/admin/food`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodId: foodId,
          available: !currentStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update availability");

      const updatedFood = await res.json();

      // Update local state
      setData((prev) =>
        prev
          ? {
              ...prev,
              foods: prev.foods.map((food) =>
                food.id === foodId
                  ? { ...food, available: updatedFood.available }
                  : food
              ),
            }
          : null
      );
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update availability");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this food item? This cannot be undone.")) return;
    await fetch(`/api/admin/food?id=${id}`, { method: "DELETE" });
    fetchFoods(); // Refresh with current filters
  };

  if (status === "loading") {
    return <RouteLoader />;
  }
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Food Items</h1>
          <p className="text-slate-600">Manage your menu items and pricing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative flex-1">
                <SearchBar
                  onSearch={setSearch}
                  placeholder="Search by name, category..."
                  defaultValue={search}
                />
              </div>

              <button
                onClick={openCreate}
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
                Add Food Item
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Total Items</div>
                <div className="text-2xl font-bold text-slate-800">
                  {totalCount}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Active</div>
                <div className="text-2xl font-bold text-green-600">
                  {data?.foods.filter((f) => f.available).length || 0}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-5">
                <div className="text-sm text-slate-600 mb-1">Categories</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {new Set(data?.foods.map((f) => f.categoryId)).size || 0}
                </div>
              </div>
            </div>

            {/* Food Items */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="mt-4 text-slate-600">Loading food items...</p>
                </div>
              ) : !data || data.foods.length === 0 ? (
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    No food items found
                  </h3>
                  <p className="text-slate-500">
                    Create your first menu item to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Price
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
                      {data.foods.map((food) => (
                        <tr
                          key={food.id}
                          className="hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden bg-slate-100">
                                {food.image ? (
                                  <img
                                    src={food.image}
                                    alt={food.name}
                                    className="h-12 w-12 object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 flex items-center justify-center">
                                    <svg
                                      className="w-6 h-6 text-slate-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-slate-900">
                                  {food.name}
                                </div>
                                {food.description && (
                                  <div className="text-sm text-slate-500 mt-1 line-clamp-1 max-w-xs">
                                    {food.description}
                                  </div>
                                )}
                                {food.options.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {food.options
                                      .slice(0, 2)
                                      .map((opt, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                          {opt.name}
                                          {opt.price > 0 && (
                                            <span className="ml-1 text-blue-600">
                                              +£{opt.price}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    {food.options.length > 2 && (
                                      <span className="text-xs text-slate-500 ml-1">
                                        +{food.options.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900 font-medium">
                              {food.categoryName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-900">
                              £{food.price}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ToggleButton
                              value={food.available}
                              onToggle={() =>
                                handleToggleAvailability(
                                  food.id,
                                  food.available
                                )
                              }
                              loading={updatingStatus === food.id}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(food)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                aria-label="Edit food"
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
                                onClick={() => handleDelete(food.id)}
                                className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                aria-label="Delete food"
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
            {totalPages > 1 && (
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
                Food Management
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
                    <div className="font-medium text-slate-800">Add Items</div>
                    <div>Create new menu items</div>
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
                    <div>Manage existing items</div>
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
                    <div>Find items quickly</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl">
                <div className="text-sm font-medium text-indigo-800 mb-1">
                  Total Menu Items
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
          <FoodModal food={editing} onClose={close} onSubmit={submit} />
        )}
      </div>
    </div>
  );
}
