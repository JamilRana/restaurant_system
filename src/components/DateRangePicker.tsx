// components/DateRangePicker.tsx
import { useState } from "react";

interface DateRangePickerProps {
  value: { startDate: Date | null; endDate: Date | null };
  onChange: (range: { startDate: Date; endDate: Date }) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [localStart, setLocalStart] = useState<string>(
    value.startDate ? value.startDate.toISOString().split("T")[0] : ""
  );
  const [localEnd, setLocalEnd] = useState<string>(
    value.endDate ? value.endDate.toISOString().split("T")[0] : ""
  );

  const applyFilter = () => {
    const startDate = localStart ? new Date(localStart) : new Date();
    const endDate = localEnd ? new Date(localEnd) : new Date();
    onChange({ startDate, endDate });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label className="font-medium text-sm">From:</label>
      <input
        type="date"
        value={localStart}
        onChange={(e) => setLocalStart(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />

      <label className="font-medium text-sm">To:</label>
      <input
        type="date"
        value={localEnd}
        onChange={(e) => setLocalEnd(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />

      <button
        onClick={applyFilter}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm ml-2 hover:bg-blue-700"
      >
        Apply
      </button>
    </div>
  );
}