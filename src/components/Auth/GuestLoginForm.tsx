"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { AuthView } from "@/app/Auth/page";

interface Props {
  onSwitch: (view: AuthView) => void;
}

export default function GuestLoginForm({ onSwitch }: Props) {
  const router = useRouter();
  const { register, handleSubmit } = useForm<{ name: string; phone: string }>();

  const onSubmit = async (data: { name: string; phone: string }) => {
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Guest login failed");
      router.push("/");
    } catch (e) {
      alert("Failed to log in as guest");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-2xl font-bold mb-2">Continue as Guest</h2>
      <input
        placeholder="Name"
        {...register("name", { required: true })}
        className="w-full border px-3 py-2 rounded mb-2"
      />
      <input
        placeholder="Phone"
        {...register("phone", { required: true })}
        className="w-full border px-3 py-2 rounded mb-2"
      />
      <button
        type="submit"
        className="bg-orange-500 w-full text-white py-2 rounded"
      >
        Continue
      </button>
    </form>
  );
}
