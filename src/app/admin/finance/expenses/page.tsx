// app/admin/finance/expenses/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ExpenseModal from "@/components/Admin/Expenses/ExpensesModal";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import type { ExpenseFormValues, Paginated } from "@/types";
import { RouteLoader } from "@/components/RouteLoader";

const CSVExportButton = dynamic(() => import("@/components/CSVExportButton"), {
  ssr: false,
  loading: () => (
    <span className="bg-green-600 text-white px-4 py-2 rounded">
      Export CSV
    </span>
  ),
});

type ApiResponse = {
  data: ExpenseFormValues[]; // ✅ Fixed: array of expenses
  totalCount: number;
  totalPages: number;
  currentPage: number;
  totalExpenses: number;
  categoryWiseTotals: Record<string, number>;
};

export default function ExpenseManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseFormValues | null>(null);
  const [staffList, setStaffList] = useState<
    { id: number; name: string; role: string }[]
  >([]);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/admin/expenses?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) throw new Error("Failed to load expenses");

      const result: ApiResponse = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, category, startDate, endDate]);

  // Fetch staff list
  const fetchStaffList = useCallback(async () => {
    if (!session?.user.restaurantId) return;
    try {
      const res = await fetch(`/api/admin/staff`);
      if (!res.ok) throw new Error("Failed to fetch staff");

      const data = await res.json();

      // ✅ Ensure it's an array
      const staffArray = Array.isArray(data) ? data : data.staff;

      if (Array.isArray(staffArray)) {
        setStaffList(staffArray);
      } else {
        console.error("Staff API did not return an array:", data);
        setStaffList([]);
      }
    } catch (err) {
      console.error("Failed to load staff", err);
      setStaffList([]); // fallback
    }
  }, [session?.user.restaurantId]);
  // Initial load
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      fetchExpenses();
      fetchStaffList();
    }
  }, [session, status, router, fetchExpenses, fetchStaffList]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(fetchExpenses, 500);
    return () => clearTimeout(timeout);
  }, [search, fetchExpenses]);

  // Refetch on filter change (except search)
  useEffect(() => {
    if (search === "") fetchExpenses();
  }, [category, startDate, endDate, limit, page, fetchExpenses, search]);
  const openCreate = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };
  const openModal = (data: ExpenseFormValues) => {
    setSelectedExpense(data);
    // setSelectedExpense(expense || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  const handleSave = () => {
    closeModal();
    fetchExpenses(); // Refresh with current filters
  };

  const goToPage = (pageNum: number) => {
    if (data && pageNum > 0 && pageNum <= data.totalPages) {
      setPage(pageNum);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // CSV Export
  const csvData = (data?.data || []).map((e) => ({
    Description: e.description,
    Category: e.category,
    Amount: `£${e.amount}`,
    Date: e.date,
    Staff: e.staff || "N/A",
    Notes: e.notes || "N/A",
  }));

  const csvHeaders = [
    { label: "Description", key: "Description" },
    { label: "Category", key: "Category" },
    { label: "Amount", key: "Amount" },
    { label: "Date", key: "Date" },
    { label: "Staff", key: "Staff" },
    { label: "Notes", key: "Notes" },
  ];

  if (status === "loading" || loading) {
    <RouteLoader />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expense Management</h1>
        <button
          onClick={() => openCreate()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
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
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, notes..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {Object.values([
                "SALARY",
                "GROCERIES",
                "UTILITIES",
                "RENT",
                "MAINTENANCE",
                "EQUIPMENT",
                "MARKETING",
                "INSURANCE",
                "TRAVEL",
                "OTHER",
              ]).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900">
            £{data?.totalExpenses || "0.00"}
          </p>
        </div>
        {data &&
          Object.entries(data.categoryWiseTotals).map(([cat, amount]) => (
            <div key={cat} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">
                {cat.replace("_", " ")}
              </h3>
              <p className="text-2xl font-bold text-gray-900">£{amount}</p>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Show{" "}
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 ml-1"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>{" "}
            entries
          </label>
        </div>
        <CSVExportButton
          data={csvData}
          headers={csvHeaders}
          filename={`expenses-${format(new Date(), "yyyy-MM-dd")}.csv`}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No expenses found matching your filters.
                  </td>
                </tr>
              ) : (
                data?.data.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {e.description}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {e.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      £{e.amount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {e.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {staffList.find((staff) => staff.id === e.staffId)
                        ?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {e.notes || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => openModal(e)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data?.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>
              Page {page} of {data.totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === data.totalPages}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        expense={selectedExpense}
        onSave={handleSave}
        staffList={staffList}
      />
    </div>
  );
}
