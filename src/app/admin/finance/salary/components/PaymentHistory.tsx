// app/admin/finance/salary/components/PaymentHistory.tsx
import { format } from "date-fns";
import { SalaryPayment } from "@/types";

type Props = {
  payments: SalaryPayment[];
  limit?: number;
  loading?: boolean;
};

export default function PaymentHistory({
  payments,
  limit = 10,
  loading,
}: Props) {
  const displayed = payments.slice(0, limit);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Payment History
          </h2>
        </div>
        <div className="p-6 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
      </div>

      {displayed.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No salary payments recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayed.map((p) => {
                // ✅ Extract hours from "Time Entry: Xh reg, Yh OT"
                const timeEntryMatch = p.notes?.match(
                  /Time Entry:\s*(\d+\.?\d*)h\s+reg,\s*(\d+\.?\d*)h\s+OT/
                );
                const regHours = timeEntryMatch
                  ? parseFloat(timeEntryMatch[1])
                  : 0;
                const otHours = timeEntryMatch
                  ? parseFloat(timeEntryMatch[2])
                  : 0;

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {p.staffName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {p.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                      £{p.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(p.date), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {regHours > 0 && `${regHours}h`}
                      {otHours > 0 && ` + ${otHours}h OT`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.notes?.split("|").map((line, i) => (
                        <div key={i} className="whitespace-pre-line">
                          {line.trim()}
                        </div>
                      )) || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
