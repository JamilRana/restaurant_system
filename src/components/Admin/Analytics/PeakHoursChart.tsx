// components/Admin/Analytics/PeakHoursChart.tsx
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions, // Import ChartOptions
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface HourlyData {
  hour: string;
  value: number;
}

interface PeakHoursChartProps {
  data: HourlyData[] | null;
}

const PeakHoursChart: React.FC<PeakHoursChartProps> = ({ data }) => {
  const sortedData = [...(data || [])].sort(
    (a, b) => parseInt(a.hour.split(":")[0]) - parseInt(b.hour.split(":")[0])
  );

  const chartData = {
    labels: sortedData.map((d) => d.hour),
    datasets: [
      {
        label: "Sales (£)",
        data: sortedData.map((d) => d.value),
        backgroundColor: "#f59e0b",
      },
    ],
  };

  // ✅ Correctly typed options
  const options: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const, // 👈 Use 'as const' or just 'top' with correct typing
      },
      title: {
        display: true,
        text: "Sales by Hour of Day",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Sales (£)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Hour",
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border h-80">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default PeakHoursChart;
