// components/Admin/Analytics/SalesTrendChart.tsx
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SalesTrendData {
  date: string;
  value: number;
}

interface SalesTrendChartProps {
  data: SalesTrendData[] | null;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ data }) => {
  const chartData = {
    labels: data?.map((d) => d.date) || [],
    datasets: [
      {
        label: "Daily Sales (£)",
        data: data?.map((d) => d.value) || [],
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Sales Trend Over Time" },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Sales (£)" } },
      x: { title: { display: true, text: "Date" } },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border h-80">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default SalesTrendChart;
