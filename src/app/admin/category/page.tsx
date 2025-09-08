// app/admin/categories/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CategoryModal from "@/components/Admin/CategoryModal";
import { RouteLoader } from "@/components/RouteLoader";
import Pagination from "@/components/Pagination";
import FoodModal from "@/components/Admin/FoodModal";
import toast from "react-hot-toast";
import SearchBar from "@/components/Admin/SearchBar";
import ToggleButton from "@/components/Admin/ToggleButton";

type Category = {
  id: number;
  name: string;
  createdAt: string;
  available: boolean;
};

type ApiResponse = {
  categories: (Category & { foodCount: number })[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export default function ManageCategories() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [totalCount, setTotalCount] = useState(1);
  const [page, setPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/Auth");
    }
  }, [session, status, router]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/category?page=${page}&limit=10`;

      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");

      const result: ApiResponse = await res.json();
      setData(result);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error("Fetch failed:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchCategories();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setIsModalOpen(true);
  };

  const openFoodCreate = (cat: Category) => {
    setEditing(cat);
    setIsFoodModalOpen(true);
  };

  const close = () => {
    setIsModalOpen(false);
    setIsFoodModalOpen(false);
    setEditing(null);
  };

  const submitFood = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/admin/food";

    const res = await fetch(url, { method, body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }
    await fetchCategories();
  };

  const submit = async (formData: FormData) => {
    const isEdit = formData.get("id");
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/admin/category";

    const res = await fetch(url, { method, body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Save failed");
    }
    fetchCategories();
    return await res.json();
  };

  const handleToggleAvailability = async (
    categoryId: number,
    currentStatus: boolean
  ) => {
    try {
      setUpdatingStatus(categoryId);
      const res = await fetch(`/api/admin/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId,
          available: !currentStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update availability");

      const updatedCategory = await res.json();

      // Update local state
      setData((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((cat) =>
                cat.id === categoryId
                  ? { ...cat, available: updatedCategory.available }
                  : cat
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
    const category = data?.categories.find((c) => c.id === id);
    if (category?.foodCount !== 0) {
      return toast.error(
        "Cannot delete category with food items. Move or delete foods first."
      );
    }

    if (!confirm("Delete this category? This cannot be undone.")) return;

    await fetch(`/api/admin/category?id=${id}`, { method: "DELETE" });
    fetchCategories();
  };

  if (status === "loading") {
    return <RouteLoader />;
  }
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Categories</h1>
          <p className="text-slate-600">Organize your menu with categories</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative flex-1">
                <SearchBar
                  onSearch={setSearch}
                  placeholder="Search by ID, name, email..."
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
                Add Category
              </button>
            </div>

            {/* Categories Grid */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  <p className="mt-4 text-slate-600">Loading categories...</p>
                </div>
              ) : data?.categories.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-12 text-center">
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
                    No categories found
                  </h3>
                  <p className="text-slate-500">
                    Create your first category to organize your menu
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data?.categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="group bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-mono text-sm text-slate-500 mb-1">
                              #{String(cat.id).slice(-6)}
                            </div>
                            <div className="relative group flex gap-4">
                              <h6 className="text-lg font-bold text-slate-800">
                                {cat.name}
                              </h6>
                              <ToggleButton
                                value={cat.available}
                                onToggle={() =>
                                  handleToggleAvailability(
                                    cat.id,
                                    cat.available
                                  )
                                }
                                loading={updatingStatus === cat.id}
                              />

                              {/* Tooltip */}
                              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap transition-all">
                                {cat.available
                                  ? "Click to deactivate"
                                  : "Click to activate"}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(cat)}
                              className="p-2 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-sm hover:bg-white/90 hover:border-slate-300 transition-all duration-200"
                              aria-label="Edit category"
                              disabled={updatingStatus !== null}
                            >
                              <svg
                                className="w-4 h-4 text-slate-600"
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
                              onClick={() => handleDelete(cat.id)}
                              className="p-2 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg hover:bg-white/90 hover:border-slate-300 hover:text-red-600 transition-all duration-200"
                              aria-label="Delete category"
                              disabled={updatingStatus !== null}
                            >
                              <svg
                                className="w-4 h-4 text-slate-600"
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
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/70">
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Created
                            </div>
                            <div className="font-medium text-slate-700">
                              {new Date(cat.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              Items
                            </div>
                            <div className="font-bold text-slate-800">
                              {cat.foodCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action footer */}
                      <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-200/70">
                        <button
                          onClick={() => openFoodCreate(cat)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
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
                          Add Food Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {data?.totalPages && data.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  page={page}
                  total={totalCount}
                  limit={10}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-6 sticky top-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                Category Management
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
                    <div className="font-medium text-slate-800">
                      Create Categories
                    </div>
                    <div>Organize your menu items</div>
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
                    <div>Manage existing categories</div>
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
                    <div>Find categories quickly</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl">
                <div className="text-sm font-medium text-indigo-800 mb-1">
                  Total Categories
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
          <CategoryModal category={editing} onClose={close} onSubmit={submit} />
        )}
        {isFoodModalOpen && (
          <FoodModal
            food={null}
            categoryId={editing?.id}
            onClose={close}
            onSubmit={submitFood}
          />
        )}
      </div>
    </div>
  );
}
