// app/admin/finance/salary/calculate.ts
import { differenceInDays, isWithinInterval } from "date-fns";
import { ApiStaff, SalaryPayment } from "@/types";

export function calculateSalaryDue(
  staff: ApiStaff,
  payments: SalaryPayment[],
  payPeriodStart: Date,
  payPeriodEnd: Date
): { expected: number; paid: number; due: number } {
  let expected = 0;
  const hireDate = new Date(staff.hireDate);
  if (hireDate > payPeriodEnd) return { expected: 0, paid: 0, due: 0 };

  const effectiveStart = hireDate > payPeriodStart ? hireDate : payPeriodStart;
  const daysInPeriod = differenceInDays(payPeriodEnd, effectiveStart) + 1;

  switch (staff.salaryPeriod) {
    case "MONTHLY":
      expected = ((staff.salary || 0) / 30) * daysInPeriod;
      break;
    case "WEEKLY":
      expected = ((staff.salary || 0) / 7) * daysInPeriod;
      break;
    case "HOURLY":
      expected = (staff.hourlyRate || 0) * 8 * daysInPeriod; // 8 hrs/day
      break;
    default:
      expected = 0;
  }

  const paid = payments
    .filter((p) => {
      const paymentDate = new Date(p.date);
      return isWithinInterval(paymentDate, {
        start: payPeriodStart,
        end: payPeriodEnd,
      });
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const due = Math.max(0, expected - paid);

  return { expected, paid, due };
}
