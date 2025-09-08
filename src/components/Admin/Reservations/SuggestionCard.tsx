import { Table } from "@/types";

export function SuggestionCard({
  table,
  isSelected,
  onSelect,
  onAssign,
  capacityNeeded,
}: {
  table: Table;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onAssign: () => void;
  capacityNeeded: number;
}) {
  const extraSeats = table.capacity - capacityNeeded;
  const isPerfectFit = extraSeats === 0;
  const isGoodFit = extraSeats <= 2;

  return (
    <div
      className={`p-3 border rounded-lg transition-all cursor-pointer hover:shadow-md dark:border-gray-700 ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
          <div>
            <div className="font-medium">Table {table.number}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {table.capacity} seats
              {isPerfectFit && (
                <span className="ml-1 text-green-600 dark:text-green-400">
                  ✓ Perfect
                </span>
              )}
              {isGoodFit && !isPerfectFit && (
                <span className="ml-1 text-blue-600 dark:text-blue-400">
                  +{extraSeats}
                </span>
              )}
              {extraSeats > 2 && (
                <span className="ml-1 text-orange-500 dark:text-orange-400">
                  +{extraSeats}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onAssign}
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition"
        >
          Assign
        </button>
      </div>
    </div>
  );
}
