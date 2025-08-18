// app/admin/finance/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FinancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.push("/");
    } else {
      setLoading(false);
    }
  }, [session, status, router]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Finance Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Management */}
        <Link 
          href="/admin/finance/expenses" 
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-2">Expense Management</h2>
          <p className="text-gray-600 mb-4">
            Track and manage all business expenses with detailed categorization and reporting.
          </p>
          <div className="flex items-center text-blue-600">
            <span>Manage Expenses</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Salary Payments */}
        <Link 
          href="/admin/finance/salary" 
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold mb-2">Salary Payments</h2>
          <p className="text-gray-600 mb-4">
            Manage staff salaries, view payment history, and track pending payments.
          </p>
          <div className="flex items-center text-blue-600">
            <span>Manage Salaries</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}