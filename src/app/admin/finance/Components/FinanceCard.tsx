// app/admin/finance/components/FinanceCard.tsx
import Link from "next/link";

export default function FinanceCard({
  title,
  value,
  change,
  href,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-200 group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
            <p className="text-sm text-green-600 mt-1">{change}</p>
          </div>
          <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}
