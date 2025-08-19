// components/Auth/RegisterForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { AuthView } from "@/app/Auth/page";
import { signIn } from "next-auth/react";

type PostcodeResult = {
  postcode: string;
  deliveryFee: number;
};

interface Props {
  onSwitch: (view: AuthView) => void;
}

export default function RegisterForm({ onSwitch }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [postCode, setPostcode] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  // Fetch results when debounced postcode changes
  useEffect(() => {
    if (!searchInput) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(
          `${origin}/api/postcode-search?query=${searchInput}&restaurantId=1`
        );
        const data = await res.json();
        setResults(Array.isArray(data.zones) ? data.zones : []);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchInput]);

  // Handle selecting a postcode
  const selectPostcode = (result: PostcodeResult) => {
    setPostcode(result.postcode);
    setSearchInput(result.postcode);
    setResults([]);
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Validate: Make sure postcode is selected
    if (!postCode || postCode.trim() === "") {
      alert("Please select a valid postcode from the list.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match");
      return;
    }

    // ✅ Send the selected postcode
    const finalData = {
      ...formData,
      postcode: postCode, // ✅ Use the string value
    };

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      if (res.status === 409) {
        alert("Email already in use. Try logging in.");
        return;
      }

      if (!res.ok) throw new Error("Registration failed");

      const signInRes = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInRes?.error) {
        throw new Error("Auto-login failed");
      }

      router.replace("/Auth/redirect");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 pb-24">
        {" "}
        {/* Space for footer */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold">Register</h2>

          <input
            placeholder="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />

          <input
            placeholder="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />

          <input
            placeholder="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />

          {/* Postcode Autocomplete */}
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. SW1A"
              className="w-full border p-2 rounded text-sm"
            />

            {/* Results Dropdown */}
            {loading ? (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg p-2">
                <p className="text-xs text-gray-500">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <ul className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                {results.map((result, i) => (
                  <li
                    key={i}
                    onClick={() => selectPostcode(result)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  >
                    <strong>{result.postcode}</strong> - £{result.deliveryFee}{" "}
                    fee
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <input
            placeholder="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />

          <input
            placeholder="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            minLength={6}
            required
          />

          <input
            placeholder="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
