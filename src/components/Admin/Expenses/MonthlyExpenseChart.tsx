import { Bar } from "react-chartjs-2";

export function MonthlyExpenseChart({ data }: { data: Array<{ category: string; amount: number }> }) {
  const chartData = {
    labels: data.map(d => d.category),
    datasets: [
      {
        label: 'Amount (£)',
        data: data.map(d => d.amount),
        backgroundColor: 'rgba(53, 162, 235, 0.6)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Monthly Expenses by Category' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return <Bar data={chartData} options={options} />;
}