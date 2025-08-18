"use client";
import React, { useState } from "react";
import OrderDetailsWrapper from "@/components/Order/OrderDetailsWrapper";
import Link from "next/link";

type OrderStatusProps = {
  status: "pending" | "approved" | "ready";
};

const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  const renderStatusBanner = () => {
    if (status === "pending") {
      return (
        <>
          <h2 className="text-center text-xl font-bold text-gray-700">
            Pending For Approval
          </h2>
          <p className="text-green-500 font-semibold text-center m-4">
            We have received your order. Once it is approved you will see the
            status update here
          </p>
        </>
      );
    }
    if (status === "approved") {
      return (
        <>
          <h2 className="text-center text-xl font-bold text-green-700 ">
            Your order is Approved
          </h2>
          <p className="bg-orange-500 text-white p-2 w-fit mx-auto text-center m-4">
            Please wait for 20 minutes and you will be able to collect your
            order.
          </p>
        </>
      );
    }
    if (status === "ready") {
      return (
        <>
          <h2 className="text-center text-xl font-bold text-green-700">
            Your Order is Ready for Pickup
          </h2>
          <p className="bg-green-600 text-white p-2  mx-auto text-center m-4">
            Please come and receive your order
          </p>
        </>
      );
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {renderStatusBanner()}

      {/* Header: Welcome + User Info */}
      <div className="mb-6 ">
        <div className="flex justify-center gap-14 md:mt-4 mt-8 text-sm w-full text-gray-700">
          <p>Syed Rafee</p>
          <p>Email: rafee@gmail.com</p>
          <p>Phone Number: 0099887666</p>
        </div>
      </div>

      {/* order summary Body */}
      <div className="w-full mx-auto md:w-1/2">
        <OrderDetailsWrapper />
      </div>
    </div>
  );
};

export default OrderStatus;
