import { Table } from "@/types";

export function ComboSuggestionCard({
  combo,
  capacityNeeded,
  onAssign,
}: {
  combo: { tables: Table[]; total: number };
  capacityNeeded: number;
  onAssign: () => void;
}) {
  const extraSeats = combo.total - capacityNeeded;
  return (
    <div className="p-3 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium">
            {combo.tables.map((t) => `Table ${t.number}`).join(" + ")}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Total: {combo.total} seats ({extraSeats} extra)
          </div>
        </div>
        <button
          onClick={onAssign}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition"
        >
          Use
        </button>
      </div>
    </div>
  );
}
