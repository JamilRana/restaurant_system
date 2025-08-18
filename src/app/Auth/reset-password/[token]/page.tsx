// app/reset-password/[token]/page.tsx
"use client"
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import ClientForm from "./ClientForm";

// No "use client" — this is a Server Component
type Props = {
  params: Promise<{ token: string }>; // params is a Promise
};

export default function ResetPasswordPage({ params }: Props) {
  const { token } = React.use(params); // ✅ Unwrap the params Promise
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      // Note: You can't use `router` without "use client", so we'll handle redirect via meta or effect in client wrapper
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <ClientForm token={token} message={message} error={error} />
  );
}