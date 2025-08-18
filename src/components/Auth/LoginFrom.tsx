"use client";

import { AuthView } from "@/app/Auth/page";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  onSwitch: (view: AuthView) => void;
}

export default function LoginForm({ onSwitch }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>();

  const onSubmit = async (data: { email: string; password: string }) => {
    const res = await signIn("credentials", {
      
      email: data.email,
      password: data.password,
      redirect: false, // Important: disable auto-redirect
    });

    if (res?.error) {
      alert("Login failed. Check your credentials.");
    } else {
      // ✅ Redirect to custom handler
      router.replace("/Auth/redirect");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-2xl font-bold">Login</h2>
      <input
        placeholder="Email"
        {...register("email", { required: true })}
        className="w-full mb-2 border px-3 py-2 rounded"
      />
      <input
        type="password"
        placeholder="Password"
        {...register("password", { required: true })}
        className="w-full mb-4 border px-3 py-2 rounded"
      />
      <button
        type="submit"
        className="bg-green-600 w-full text-white py-2 rounded mb-2"
      >
        Login
      </button>
    </form>
  );
}