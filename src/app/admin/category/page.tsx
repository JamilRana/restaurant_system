// app/admin/categories/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CategoryModal from "@/components/Admin/CategoryModal";
import { RouteLoader } from "@/components/RouteLoader";

type Category = {
  id: number;
  name: string;
  image: string | null;
  createdAt: string;
};

type ApiResponse = {
  categories: Category[];
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
  const [editing, setEditing] = useState<Category | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch categories from server
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: search,
      });

      const res = await fetch(`/api/admin/category?${params.toString()}`, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const result: ApiResponse = await res.json();
      setData(result);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]); // ✅ Correct dependencies

  // Initial load and refetch on page/search change
  // Handle authentication redirect
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/Auth");
    }
  }, [session, status, router]);

  // Debounced fetch on search or pagination
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 500);

    return () => clearTimeout(timer);
  }, [search, page]); // Refetch when search or page changes

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setIsModalOpen(true);
  };

  const close = () => {
    setIsModalOpen(false);
    setEditing(null);
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
    fetchCategories(); // Refetch with current filters
    return await res.json();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    await fetch(`/api/admin/category?id=${id}`, { method: "DELETE" });
    fetchCategories(); // Refresh with current filters
  };

  const goToPage = (pageNum: number) => {
    if (data && pageNum > 0 && pageNum <= data.totalPages) {
      setPage(pageNum);
    }
  };

  if (status === "loading" || loading) {
    <RouteLoader />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Categories</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-1"
        >
          <span>+</span> Add Category
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search category name..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading && (
        <div className="text-center py-2 text-gray-500">Searching...</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  Loading category...
                </td>
              </tr>
            ) : data?.categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {search
                    ? `No categories match "${search}".`
                    : "No categories found."}
                </td>
              </tr>
            ) : (
              data?.categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
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
      {data?.totalPages && data.totalPages > 1 ? (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span>
            Page {page} of {data.totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === data.totalPages}
            className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      ) : null}

      {/* Modal */}
      {isModalOpen && (
        <CategoryModal category={editing} onClose={close} onSubmit={submit} />
      )}
    </div>
  );
}
