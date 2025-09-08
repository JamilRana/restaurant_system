// app/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";

// ✅ Types
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
  const { data: session, status, update: updateSession } = useSession();
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

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [availablePostcodes, setAvailablePostcodes] = useState<string[]>([]);
  const [loadingPostcodes, setLoadingPostcodes] = useState(true);

  const [hasFetchedProfile, setHasFetchedProfile] = useState(false);
  const fetchProfileRef = useRef(false);

  // 🔹 Fetch postcodes
  useEffect(() => {
    const fetchPostcodes = async () => {
      try {
        const res = await fetch("/api/delivery-fee");
        if (!res.ok) throw new Error("Failed to load postcodes");
        const data = await res.json();
        setAvailablePostcodes(data.postcodes || []);
      } catch (err) {
        toast.error("Could not load postcodes");
      } finally {
        setLoadingPostcodes(false);
      }
    };
    fetchPostcodes();
  }, []);

  // 🔹 Fetch profile
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "CUSTOMER") {
      router.push("/auth");
      return;
    }

    if (!hasFetchedProfile && !fetchProfileRef.current) {
      fetchProfileRef.current = true;
      fetchProfile();
    }
  }, [status, session]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
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
      setHasFetchedProfile(true);
    } catch (err: any) {
      toast.error(err.message || "Could not load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  // 🔹 Profile handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Update Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", ...profileData }),
        credentials: "include",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");

      await updateSession(profileData).catch(console.warn);
      toast.success("✅ Profile updated!");
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // 🔹 Update Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPassword(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsSubmittingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", ...passwordData }),
        credentials: "include",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Password update failed");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("🔐 Password changed!");
    } catch (err: any) {
      toast.error(err.message || "Password update failed");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // 🔹 Show loader only on first load
  if (status === "loading" || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Update your personal details and security
          </p>
        </div>

        {/* === Profile Section === */}
        <Card title="Personal Information" icon="👤">
          <form
            onSubmit={handleProfileSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <TextInput
              label="Full Name"
              name="name"
              value={profileData.name}
              onChange={handleProfileChange}
              required
            />
            <TextInput
              label="Phone"
              name="phone"
              value={profileData.phone}
              onChange={handleProfileChange}
            />
            <TextInput
              label="Email"
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
              required
            />
            <TextInput
              label="Address"
              name="address"
              value={profileData.address}
              onChange={handleProfileChange}
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postcode
              </label>
              {loadingPostcodes ? (
                <SkeletonInput />
              ) : (
                <PostcodeAutocomplete
                  value={profileData.postcode}
                  onChange={(value) =>
                    setProfileData((prev) => ({ ...prev, postcode: value }))
                  }
                  availablePostcodes={availablePostcodes}
                />
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" loading={isSubmittingProfile}>
                Update Profile
              </Button>
            </div>
          </form>
        </Card>

        {/* === Password Section === */}
        <Card title="Change Password" icon="🔒">
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <TextInput
              label="Current Password"
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
            <TextInput
              label="New Password"
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              minLength={6}
              required
            />
            <TextInput
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                color="green"
                loading={isSubmittingPassword}
              >
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* ✅ Toast Container (auto-injected by react-hot-toast) */}
    </div>
  );
}

/* ========================== Reusable Components ========================== */

// ✅ Card with Glass Effect
function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-6 mb-8 border border-white/40 hover:shadow-2xl transition-shadow duration-300">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-lg">{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

// ✅ Text Input with Modern Focus
function TextInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
      />
    </div>
  );
}

// ✅ Button with Glass & Hover
function Button({
  children,
  color = "blue",
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  color?: "blue" | "green";
}) {
  const base =
    "px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg";
  const colors =
    color === "blue"
      ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
      : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white";

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`${base} ${colors} disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
    >
      {loading ? <LoadingSpinner size="sm" /> : children}
    </button>
  );
}

// ✅ Loading Spinner
function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-white`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      ></path>
    </svg>
  );
}

// ✅ Postcode Autocomplete (Glass Style)
function PostcodeAutocomplete({
  value,
  onChange,
  availablePostcodes,
}: {
  value: string;
  onChange: (value: string) => void;
  availablePostcodes: string[];
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const normalizedInput = inputValue.trim().toUpperCase();
    if (!normalizedInput) return availablePostcodes;
    return availablePostcodes.filter((pc) =>
      pc.toUpperCase().includes(normalizedInput)
    );
  }, [inputValue, availablePostcodes]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (pc: string) => {
    setInputValue(pc);
    onChange(pc);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
        placeholder="Start typing postcode..."
      />
      {isOpen && (
        <ul className="absolute z-10 mt-2 w-full bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((pc) => (
              <li
                key={pc}
                onClick={() => handleSelect(pc)}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm transition-colors"
              >
                {pc}
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-gray-500">
              No matching postcodes
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ✅ Skeleton
function SkeletonInput() {
  return <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse" />;
}
