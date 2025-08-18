"use client";
import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";
import GuestLoginForm from "@/components/Auth/GuestLoginForm";
import LoginForm from "@/components/Auth/LoginFrom";
import RegisterForm from "@/components/Auth/RegisterForm";
import PasswordSentMessage from "@/components/Auth/PasswordSentMessage";
import React, { useState } from "react";

export type AuthView =
  | "login"
  | "register"
  | "guest"
  | "forgot-password"
  | "password-sent";

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("login");

  const handleSwitch = (next: AuthView) => setView(next);

  return (
    <div className="items-center justify-center  h-[calc(90vh-6rem)] md:h-[calc(90vh-6rem)] bg-white px-2 py-2">
      <div className="flex flex-wrap font-sm text-black justify-center items-center gap-2 ">
        <button
          onClick={() => handleSwitch("login")}
          className="hover:text-orange-600"
        >
          Login
        </button>
        <span>|</span>
        <button
          onClick={() => handleSwitch("register")}
          className="hover:text-orange-600"
        >
          Register
        </button>
        <span>|</span>
        <button
          onClick={() => handleSwitch("guest")}
          className="hover:text-orange-600"
        >
          Guest
        </button>
        <span>|</span>
        <button
          onClick={() => handleSwitch("forgot-password")}
          className="hover:text-orange-600"
        >
          Forgot Password
        </button>
      </div>
      <div className="overflow-hidden flex flex-col w-full p-4 gap-4 h-[calc(100vh-6rem)] md:h-[calc(100vh-9rem)] lg:flex-row items-center justify-center">
        {/* Left Image & Rating */}
        <div className="hidden relative md:flex h-80">
          <img src="/images/burger-meal.png" className="rounded-xl w-[450px]" />
          <div className="absolute bottom-5 left-5 bg-white px-3 py-2 rounded-lg shadow text-center">
            <p className="text-3xl font-bold">3.4</p>
            <p className="text-yellow-500">★★★★☆</p>
            <p className="text-gray-500 text-sm">1,360 reviews</p>
          </div>
        </div>

        <div className="w-full max-w-md flex-1 px-4 ">
          {view === "login" && <LoginForm onSwitch={handleSwitch} />}
          {view === "register" && <RegisterForm onSwitch={handleSwitch} />}
          {view === "guest" && <GuestLoginForm onSwitch={handleSwitch} />}
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
