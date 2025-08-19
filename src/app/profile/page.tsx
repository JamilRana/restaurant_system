// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RouteLoader } from "@/components/RouteLoader";

type ProfileFormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
};

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { update: updateSession } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    postcode: "",
  });
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "CUSTOMER") {
      router.push("/Auth");
    } else {
      fetchProfile();
    }
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile`);
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setProfileData({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        postcode: data.postcode || "",
      });
    } catch (err: any) {
      setProfileError("Could not load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setIsSubmittingProfile(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profile",
          ...profileData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Update failed");
      }

      await updateSession({
        name: profileData.name,
        email: profileData.email,
        address: profileData.address,
        phone: profileData.phone,
        postcode: profileData.postcode,
      });

      setProfileSuccess("Profile updated successfully!");
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setIsSubmittingPassword(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "password",
          ...passwordData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Password update failed");
      }

      setPasswordSuccess("Password updated successfully!");
      // Clear password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (status === "loading" || loading) {
    <RouteLoader />;
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-8">Your Profile</h1>

      {/* === Profile Section === */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

        {profileError && (
          <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="bg-green-100 text-green-700 p-3 mb-4 rounded">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={profileData.name}
              onChange={handleProfileChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={profileData.phone}
              onChange={handleProfileChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={profileData.address}
              onChange={handleProfileChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1">Postcode</label>
            <input
              type="text"
              name="postcode"
              value={profileData.postcode}
              onChange={handleProfileChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmittingProfile}
              className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-blue-400"
            >
              {isSubmittingProfile ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
      </section>

      <hr className="my-8 border-gray-300" />

      {/* === Password Section === */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>

        {passwordError && (
          <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="bg-green-100 text-green-700 p-3 mb-4 rounded">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="w-full border px-3 py-2 rounded"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block mb-1">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="bg-green-600 text-white px-6 py-2 rounded disabled:bg-green-400"
            >
              {isSubmittingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
