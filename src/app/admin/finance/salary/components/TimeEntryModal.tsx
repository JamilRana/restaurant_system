// app/admin/finance/salary/components/TimeEntryModal.tsx
import { useEffect, useState } from "react";
import { ApiStaff } from "@/types";
import { set } from "date-fns";

type TimeEntry = {
  date: string;
  hours: string;
  overtimeHours: string;
};

type Props = {
  staff: ApiStaff;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    totalHours: number;
    totalOvertimeHours: number;
    hourlyRate: number;
    overtimeRate: number;
    totalAmount: number;
    entries: TimeEntry[];
    notes: string;
  }) => void | Promise<void>;
  loading?: boolean;
};

export default function TimeEntryModal({
  staff,
  isOpen,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [hourlyRate, setHourlyRate] = useState<string>(
    staff.hourlyRate ? Number(staff.hourlyRate).toFixed(2) : "0.00"
  );
  const [overtimeRate, setOvertimeRate] = useState<string>("1.5");
  const [entries, setEntries] = useState<TimeEntry[]>(() => {
    if (staff.salaryPeriod === "WEEKLY") {
      return Array(7)
        .fill(null)
        .map((_, i) => ({
          date: "",
          hours: i < 5 ? "8" : "0", // 8h Mon-Fri, 0 Sat-Sun
          overtimeHours: "0",
        }));
    } else {
      return [{ date: "", hours: "0", overtimeHours: "0" }];
    }
  });
  const [notes, setNotes] = useState("");

  // Auto-fill dates: Monday to Sunday
  useEffect(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday

    setEntries((prev) =>
      prev.map((entry, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        return {
          ...entry,
          date: entry.date || date.toISOString().split("T")[0],
        };
      })
    );
  }, []);

  const handleEntryChange = (
    index: number,
    field: "hours" | "overtimeHours" | "date",
    value: string
  ) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const addDay = () => {
    setEntries([
      ...entries,
      {
        date: new Date().toISOString().split("T")[0],
        hours: "8",
        overtimeHours: "0",
      },
    ]);
  };

  const removeDay = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  // Parse values safely
  const hr = parseFloat(hourlyRate) || 0;
  const otRate = parseFloat(overtimeRate) || 1.5;

  const totalHours = entries.reduce(
    (sum, e) => sum + (parseFloat(e.hours) || 0),
    0
  );
  const totalOvertime = entries.reduce(
    (sum, e) => sum + (parseFloat(e.overtimeHours) || 0),
    0
  );

  const regularPay = totalHours * hr;
  const salaryPay = staff.salary || 0;
  const overtimePay = totalOvertime * hr * otRate;
  const totalAmount = regularPay + overtimePay + Number(salaryPay);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hasValidEntries = entries.some(
      (e) =>
        (parseFloat(e.hours) || 0) > 0 || (parseFloat(e.overtimeHours) || 0) > 0
    );
    if (!hasValidEntries) {
      alert("Please enter at least some hours.");
      return;
    }

    onSubmit({
      totalHours,
      totalOvertimeHours: totalOvertime,
      hourlyRate: hr,
      overtimeRate: otRate,
      totalAmount,
      entries,
      notes,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Log Time for {staff.name}
            </h2>
            <p className="text-sm text-gray-600">
              Base Hourly Rate: £
              {Number(staff.hourlyRate)?.toFixed(2) || "0.00"}/hr
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rate Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Rate (£)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overtime Rate (x)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Time Entries Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Regular Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Overtime Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) =>
                          handleEntryChange(index, "date", e.target.value)
                        }
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                        required
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={entry.hours}
                        onChange={(e) =>
                          handleEntryChange(index, "hours", e.target.value)
                        }
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={entry.overtimeHours}
                        onChange={(e) =>
                          handleEntryChange(
                            index,
                            "overtimeHours",
                            e.target.value
                          )
                        }
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entries.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeDay(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addDay}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Another Day
          </button>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div>
              Hourly Rate: <strong>£{hr.toFixed(2)}/hr</strong>
            </div>
            <div>
              Overtime Rate: <strong>{otRate}x</strong>
            </div>
            <div>
              Total Regular Hours: <strong>{totalHours}h</strong> → £
              {regularPay.toFixed(2)}
            </div>
            <div>
              Total Overtime Hours: <strong>{totalOvertime}h</strong> → £
              {overtimePay.toFixed(2)}
            </div>
            <div className="pt-2 border-t font-bold text-lg">
              Total to Pay:{" "}
              <span className="text-green-700">£{totalAmount}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="e.g. Weekend shift, extra delivery duties"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                "Submit Timesheet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
