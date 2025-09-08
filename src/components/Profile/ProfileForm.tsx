// components/ProfileForm.tsx
"use client";

import { useState, useEffect } from "react";
import { PostcodeInput } from "@/components/PostcodeInput";
import { useSession, signOut } from "next-auth/react";
import { toast } from "react-hot-toast"; // ← We'll use this for nice toasts
import { LoadingSpinner } from "../LoadingSpinner";

type ProfileFormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
};

export function ProfileForm() {
  const { data: session, update: updateSession } = useSession();

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    postcode: "",
  });
  const [availablePostcodes, setAvailablePostcodes] = useState<string[]>([]);
  const [loadingPostcodes, setLoadingPostcodes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Load postcodes
  useEffect(() => {
    const fetchPostcodes = async () => {
      try {
        const res = await fetch("/api/delivery-fee");
        if (!res.ok) throw new Error("Failed to load postcodes");
        const data = await res.json();
        setAvailablePostcodes(data.postcodes || []);
      } catch (err) {
        console.error("Failed to load postcodes", err);
        toast.error("Could not load postcodes.");
      } finally {
        setLoadingPostcodes(false);
      }
    };
    fetchPostcodes();
  }, []);

  // 🔹 Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load profile");

        const data = await res.json();
        setProfileData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          postcode: data.postcode || "",
        });
      } catch (err) {
        console.error("Failed to load profile", err);
        toast.error("Could not load profile data.");
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePostcodeChange = (value: string) => {
    setProfileData((prev) => ({ ...prev, postcode: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profile",
          ...profileData,
        }),
        credentials: "include",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Update failed");
      }

      // Update session with new data
      await updateSession({
        name: profileData.name,
        email: profileData.email,
        address: profileData.address,
        phone: profileData.phone,
        postcode: profileData.postcode,
      }).catch(console.warn);

      // ✅ Success toast
      toast.success("Profile updated successfully!");

      // Optionally refetch to ensure sync with server
      // const freshRes = await fetch("/api/profile", { credentials: "include" });
      // const freshData = await freshRes.json();
      // setProfileData({...}) // if needed
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          type="text"
          name="name"
          value={profileData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          value={profileData.phone}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={profileData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          name="address"
          value={profileData.address}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Postcode
        </label>
        <PostcodeInput
          value={profileData.postcode}
          onChange={handlePostcodeChange}
          availablePostcodes={availablePostcodes}
          loading={loadingPostcodes}
          placeholder="Enter your postcode"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner />
              Updating...
            </>
          ) : (
            "Update Profile"
          )}
        </button>
      </div>
    </form>
  );
}
