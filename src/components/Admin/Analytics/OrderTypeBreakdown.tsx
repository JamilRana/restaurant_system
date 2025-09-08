// components/Admin/Analytics/OrderTypeBreakdown.tsx
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

interface OrderTypeData {
  PICKUP: number;
  DELIVERY: number;
  DINEIN: number;
}

interface OrderTypeBreakdownProps {
  data: OrderTypeData | null;
}

const OrderTypeBreakdown: React.FC<OrderTypeBreakdownProps> = ({ data }) => {
  const chartData = {
    labels: ["Pickup", "Delivery", "Dine-In"],
    datasets: [
      {
        label: "Number of Orders",
        data: [data?.PICKUP || 0, data?.DELIVERY || 0, data?.DINEIN || 0],
        backgroundColor: "#10b981",
      },
    ],
  };

  // Define options with correct typing
  const options: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top", // ✅ Now typed correctly
      },
      title: {
        display: true,
        text: "Order Type Breakdown",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Orders",
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

export default OrderTypeBreakdown;
