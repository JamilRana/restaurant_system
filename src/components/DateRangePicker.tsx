// components/Admin/Analytics/DateRangePicker.tsx
import { useState } from "react";

interface DateRangePickerProps {
  value: { startDate: Date | null; endDate: Date | null };
  onChange: (range: { startDate: Date; endDate: Date }) => void;
}

export default function DateRangePicker({
  value,
  onChange,
}: DateRangePickerProps) {
  const [localStart, setLocalStart] = useState<string>(
    value.startDate ? value.startDate.toISOString().split("T")[0] : ""
  );
  const [localEnd, setLocalEnd] = useState<string>(
    value.endDate ? value.endDate.toISOString().split("T")[0] : ""
  );

  const handleApply = () => {
    const startDate = localStart ? new Date(localStart) : new Date();
    const endDate = localEnd ? new Date(localEnd) : new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert("Please enter valid dates.");
      return;
    }

    if (startDate > endDate) {
      alert("Start date must be before or equal to end date.");
      return;
    }

    onChange({ startDate, endDate });
  };

  const handleReset = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startStr = thirtyDaysAgo.toISOString().split("T")[0];
    const endStr = new Date().toISOString().split("T")[0];

    setLocalStart(startStr);
    setLocalEnd(endStr);

    onChange({
      startDate: thirtyDaysAgo,
      endDate: new Date(),
    });
  };

  return (
    <div className="flex flex-wrap items-center bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-lg rounded-xl px-5 py-4 transition-all duration-200 min-h-16">
      {/* From Date */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700 min-w-fit">
          From:
        </label>
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          max={localEnd || undefined}
          className="px-3 py-1.5 text-sm border border-slate-300/70 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-150 shadow-sm hover:shadow-xs"
        />
      </div>

      {/* To Date */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700 min-w-fit">
          To:
        </label>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          min={localStart || undefined}
          max={new Date().toISOString().split("T")[0]}
          className="px-3 py-1.5 text-sm border border-slate-300/70 rounded-lg bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-150 shadow-sm hover:shadow-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={handleReset}
          className="text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg transition-all duration-150 font-medium flex items-center gap-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset
        </button>

        <button
          onClick={handleApply}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm px-4 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 font-medium flex items-center gap-1.5 group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 opacity-90 group-hover:opacity-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Apply
        </button>
      </div>
    </div>
  );
}
