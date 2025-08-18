"use client";

import { AuthView } from "@/app/Auth/page";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { sendPasswordResetEmail } from "@/lib/mail";
import { useRouter } from "next/navigation";

interface Props {
  onSwitch: (view: AuthView) => void;
}

export default function ForgotPasswordForm({ onSwitch }: Props) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ email: string }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = async (data: { email: string }) => {
    try {
      setMessage("");
      setError("");

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      setMessage("Password reset link sent to your email.");
      setTimeout(() => {
        onSwitch("login"); // Optionally switch back to login
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-2xl font-bold mb-2">Forgot Password</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {message && <p className="text-green-500 text-sm">{message}</p>}

      <input
        type="email"
        placeholder="Your email"
        {...register("email", { required: true })}
        className="w-full border px-3 py-2 rounded mb-2"
        disabled={isSubmitting}
      />

      <button
        type="submit"
        className="bg-green-600 w-full text-white py-2 rounded hover:bg-green-700 disabled:opacity-70"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Send Reset Link"}
      </button>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => onSwitch("login")}
        >
          Back to Login
        </button>
      </div>
    </form>
  );
}
