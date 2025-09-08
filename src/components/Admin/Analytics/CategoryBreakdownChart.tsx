// components/Admin/Analytics/CategoryBreakdownChart.tsx
import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[] | null;
}

const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  data,
}) => {
  const chartData = {
    labels: data?.map((d) => d.name) || [],
    datasets: [
      {
        data: data?.map((d) => d.value) || [],
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
        ],
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "right" as const },
      title: { display: true, text: "Sales by Category" },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border h-80">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default CategoryBreakdownChart;
