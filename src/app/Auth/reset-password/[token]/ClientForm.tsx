// app/reset-password/[token]/ClientForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

interface ClientFormProps {
  token: string;
  message: string;
  error: string;
}

export default function ClientForm({ token, message: initialMessage, error: initialError }: ClientFormProps) {
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState(initialError);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>();

  const onSubmit = async (data: { password: string }) => {
    try {
      setMessage("");
      setError("");

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to reset password");

      setMessage("Password reset successful!");
      setTimeout(() => {
        router.push("/Auth");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle external message updates if needed
  useEffect(() => {
    if (initialMessage) setMessage(initialMessage);
    if (initialError) setError(initialError);
  }, [initialMessage, initialError]);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Reset Password</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {message ? (
        <p className="text-green-500">{message}</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "At least 6 characters" },
            })}
            className="w-full border px-3 py-2 rounded"
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}