// app/Auth/page.tsx
"use client";

import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";
import LoginForm from "@/components/Auth/LoginFrom";
import RegisterForm from "@/components/Auth/RegisterForm";
import PasswordSentMessage from "@/components/Auth/PasswordSentMessage";
import React, { useState } from "react";

export type AuthView =
  | "login"
  | "register"
  | "forgot-password"
  | "password-sent";

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("login");

  const handleSwitch = (next: AuthView) => setView(next);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Tabs */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-700">
          <button
            onClick={() => handleSwitch("login")}
            className={`hover:text-orange-600 transition ${
              view === "login"
                ? "font-semibold text-orange-600 border-b-2 border-orange-600"
                : ""
            }`}
          >
            Login
          </button>
          <button
            onClick={() => handleSwitch("register")}
            className={`hover:text-orange-600 transition ${
              view === "register"
                ? "font-semibold text-orange-600 border-b-2 border-orange-600"
                : ""
            }`}
          >
            Register
          </button>
          <button
            onClick={() => handleSwitch("forgot-password")}
            className={`hover:text-orange-600 transition ${
              view === "forgot-password"
                ? "font-semibold text-orange-600 border-b-2 border-orange-600"
                : ""
            }`}
          >
            Forgot Password
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-center gap-8 px-4 py-6">
        {/* Left Image & Rating (Desktop) */}
        <div className="hidden md:block relative w-full max-w-xs">
          <img
            src="/images/burger-meal.png"
            alt="Burger Meal"
            className="w-full h-auto max-h-80 object-cover rounded-xl"
          />
          <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow text-center">
            <p className="text-2xl font-bold text-gray-800">3.4</p>
            <p className="text-yellow-500">★★★★☆</p>
            <p className="text-gray-500 text-xs">1,360 reviews</p>
          </div>
        </div>

        {/* Form */}
        <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-lg">
          {view === "login" && <LoginForm onSwitch={handleSwitch} />}
          {view === "register" && <RegisterForm onSwitch={handleSwitch} />}
          {view === "forgot-password" && (
            <ForgotPasswordForm onSwitch={handleSwitch} />
          )}
          {view === "password-sent" && (
            <PasswordSentMessage onSwitch={handleSwitch} />
          )}
        </div>
      </div>
    </div>
  );
}
