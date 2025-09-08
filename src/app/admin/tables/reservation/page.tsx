// app/admin/reservations/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RouteLoader } from "@/components/RouteLoader";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/Admin/SearchBar";
import DateRangePicker from "@/components/DateRangePicker";
import { SuggestionCard } from "@/components/Admin/Reservations/SuggestionCard";
import { ComboSuggestionCard } from "@/components/Admin/Reservations/ComboSuggestionCard";
import { Table, Reservation } from "@/types";

type Suggestion = {
  allFitTables: Table[]; // ✅ All tables that fit
  bestFit: Table | null;
  combinations: {
    tables: Table[];
    total: number;
  }[];
  availableTables: Table[];
};

export default function AdminReservations() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);
      if (dateRange.startDate)
        params.append("startsAt", dateRange.startDate.toISOString());
      if (dateRange.endDate)
        params.append("endDate", dateRange.endDate.toISOString());

      const res = await fetch(`/api/admin/tables/reservations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setReservations(data.reservations || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching reservations:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, dateRange]);

  // Effect 1: On mount and when filters change
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !["ADMIN", "WAITER"].includes(session.user.role)) {
      router.push("/Auth");
      return;
    }
    console.log("Effect triggered", {
      status,
      session,
      page,
      search,
      dateRange,
    });
    fetchReservations();
  }, [session, status, page, search, dateRange]);

  // Effect 2: Reset page on search/date change
  useEffect(() => {
    setPage(1);
  }, [search, dateRange]);

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [modalSuggestions, setModalSuggestions] = useState<Suggestion | null>(
    null
  );
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    if (selectedReservation) {
      setIsModalLoading(true);
      getCachedSuggestions(
        selectedReservation.guests,
        selectedReservation.startsAt
      )
        .then(setModalSuggestions)
        .finally(() => setIsModalLoading(false));
    }
  }, [selectedReservation]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedReservation(null);
    };
    if (selectedReservation) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedReservation]);

  const [suggestionCache, setSuggestionCache] = useState<
    Record<string, Suggestion>
  >({});

  const getCachedSuggestions = async (guests: number, date: string) => {
    const key = `${guests}-${date}`;
    if (suggestionCache[key]) return suggestionCache[key];

    const res = await fetch(
      `/api/admin/tables/suggestions?guests=${guests}&date=${date}`
    );
    const data = await res.json();

    // ✅ Build full Suggestion object
    const suggestions: Suggestion = {
      allFitTables: data.allFitTables || [], // ✅ Now included
      bestFit: data.bestFit || null,
      combinations: data.combinations || [],
      availableTables: data.availableTables || [],
    };

    setSuggestionCache((prev) => ({ ...prev, [key]: suggestions }));
    return suggestions;
  };

  const updateStatus = useCallback(
    async (
      id: number,
      status: string,
      tableIds?: number[] // <-- accept multiple
    ) => {
      const res = await fetch(`/api/admin/tables/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          tableIds: tableIds && tableIds.length > 0 ? tableIds : undefined,
        }),
      });

      if (res.ok) {
        const updatedReservation = await res.json();
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? updatedReservation : r))
        );
      }
    },
    []
  );

  const deleteReservation = useCallback(async (id: number) => {
    if (!confirm("Delete this reservation?")) return;
    await fetch(`/api/admin/tables/reservations/${id}`, { method: "DELETE" });
    setReservations((prev) => prev.filter((r) => r.id !== id));
    fetchReservations();
  }, []);

  if (status === "loading" || loading) {
    return <RouteLoader />;
  }

  if (!session || !["ADMIN", "WAITER"].includes(session.user.role)) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reservations</h1>
        <div className="text-sm text-gray-500">Total: {totalCount}</div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="md:w-1/2">
          <SearchBar
            onSearch={setSearch}
            placeholder="Search by name, phone, email..."
          />
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {reservations.length === 0 ? (
        <p className="text-gray-500 text-center py-10">
          No reservations found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white border rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-semibold">Guest</th>
                <th className="text-left p-3 font-semibold">Table</th>
                <th className="text-left p-3 font-semibold">Date & Time</th>
                <th className="text-left p-3 font-semibold">Guests</th>
                <th className="text-left p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reservations.map((r) => {
                const date = new Date(r.startsAt);
                const formatted = date.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const statusColor = {
                  PENDING: "bg-gray-100 text-gray-800",
                  CONFIRMED: "bg-green-100 text-green-800",
                  COMPLETED: "bg-blue-100 text-blue-800",
                  CANCELLED: "bg-red-100 text-red-800",
                }[r.status];

                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div>{r.name}</div>
                      <div className="text-sm text-gray-500">{r.phone}</div>
                    </td>
                    <td className="p-3">
                      {r.tables && r.tables.length > 0
                        ? r.tables
                            .map((t) => `Table ${t.table.number}`)
                            .join(", ")
                        : "Not assigned"}
                    </td>
                    <td className="p-3 font-mono text-sm">{formatted}</td>
                    <td className="p-3">{r.guests}</td>
                    <td className="p-3 space-y-2">
                      {/* Status Badge */}
                      <div
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                      >
                        {r.status}
                      </div>

                      {/* Action Buttons */}
                      {r.status === "PENDING" && !r.table && (
                        <>
                          <button
                            onClick={() => setSelectedReservation(r)}
                            className="text-xs text-blue-600 underline block mt-1"
                          >
                            Assign Table
                          </button>
                          <button
                            onClick={async () => {
                              const data = await getCachedSuggestions(
                                r.guests,
                                r.startsAt
                              );
                              const tableIds =
                                data.allFitTables.length > 0
                                  ? [data.allFitTables[0].id]
                                  : data.combinations.length > 0
                                  ? data.combinations[0].tables.map((t) => t.id)
                                  : [];

                              if (tableIds.length > 0) {
                                updateStatus(r.id, "CONFIRMED", tableIds);
                              } else {
                                alert("No tables available");
                              }
                            }}
                            className="text-xs text-green-600 underline mt-1"
                          >
                            ✅ Auto-Assign
                          </button>
                        </>
                      )}

                      {r.status === "CONFIRMED" && (
                        <button
                          onClick={() => updateStatus(r.id, "COMPLETED")}
                          className="text-xs text-blue-600 underline mt-1"
                        >
                          Mark Completed
                        </button>
                      )}

                      {r.status === "COMPLETED" && (
                        <span className="text-xs text-gray-500">Completed</span>
                      )}

                      {r.status === "CANCELLED" && (
                        <span className="text-xs text-red-500">Cancelled</span>
                      )}

                      <button
                        onClick={() => deleteReservation(r.id)}
                        className="block w-full text-left text-sm text-red-600 hover:text-red-800 mt-1"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          total={totalCount}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {selectedReservation && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Assign Table
                </h3>
                <button
                  onClick={() => {
                    setSelectedReservation(null);
                    setSelectedTableIds([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  &times;
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                For <strong>{selectedReservation.guests}</strong> guests on{" "}
                <strong>
                  {new Date(selectedReservation.startsAt).toLocaleString()}
                </strong>
              </p>

              {isModalLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
                  {/* ✅ Individual Table Suggestions */}
                  {modalSuggestions &&
                    modalSuggestions?.allFitTables.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                          <span className="bg-green-100 dark:bg-green-900/40 p-1 rounded text-green-700 dark:text-green-400 mr-2 text-xs">
                            ✓
                          </span>
                          Best Fit Tables
                        </h4>
                        <div className="space-y-2">
                          {modalSuggestions.allFitTables.map((table) => (
                            <SuggestionCard
                              key={table.id}
                              table={table}
                              isSelected={selectedTableIds.includes(table.id)}
                              onSelect={(checked) =>
                                checked
                                  ? setSelectedTableIds((prev) => [
                                      ...prev,
                                      table.id,
                                    ])
                                  : setSelectedTableIds((prev) =>
                                      prev.filter((id) => id !== table.id)
                                    )
                              }
                              onAssign={() => {
                                updateStatus(
                                  selectedReservation.id,
                                  "CONFIRMED",
                                  [table.id]
                                );
                                setSelectedReservation(null);
                                setSelectedTableIds([]);
                              }}
                              capacityNeeded={selectedReservation.guests}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* ✅ Combo Suggestions (Only if no single fit) */}
                  {!modalSuggestions?.bestFit &&
                    modalSuggestions &&
                    modalSuggestions?.combinations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                          <span className="bg-blue-100 dark:bg-blue-900/40 p-1 rounded text-blue-700 dark:text-blue-400 mr-2 text-xs">
                            +
                          </span>
                          Combined Options
                        </h4>
                        <div className="space-y-2">
                          {modalSuggestions.combinations.map((combo, idx) => (
                            <ComboSuggestionCard
                              key={idx}
                              combo={combo}
                              capacityNeeded={selectedReservation.guests}
                              onAssign={() => {
                                updateStatus(
                                  selectedReservation.id,
                                  "CONFIRMED",
                                  combo.tables.map((t) => t.id)
                                );
                                setSelectedReservation(null);
                                setSelectedTableIds([]);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* ✅ No Suggestions Fallback */}
                  {!modalSuggestions?.allFitTables.length &&
                    !modalSuggestions?.combinations.length && (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                        🚫 No available tables for this time and party size.
                      </div>
                    )}
                </div>
              )}

              {/* Multi-select Assign Button */}
              {selectedTableIds.length > 1 && (
                <button
                  onClick={() => {
                    updateStatus(
                      selectedReservation.id,
                      "CONFIRMED",
                      selectedTableIds
                    );
                    setSelectedReservation(null);
                    setSelectedTableIds([]);
                  }}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition"
                >
                  Assign {selectedTableIds.length} Tables
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedReservation(null);
                  setSelectedTableIds([]);
                }}
                className="w-full mt-2 border border-gray-300 dark:border-gray-600 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
