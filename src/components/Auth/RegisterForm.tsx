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
  const [postcode, setPostcode] = useState(""); // User can type
  const [searchResults, setSearchResults] = useState<PostcodeResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  const debouncedPostcode = useDebounce(postcode, 500);

  // Fetch results when debounced postcode changes
  useEffect(() => {
    if (debouncedPostcode.length > 2) {
      fetch(`/api/postcodesearch?query=${encodeURIComponent(debouncedPostcode)}`)
        .then((res) => res.json())
        .then((data: PostcodeResult[]) => {
          setSearchResults(data);
        })
        .catch(() => {
          setSearchResults([]);
        });
    } else {
      setSearchResults([]);
    }
  }, [debouncedPostcode]);

  // Handle selecting a postcode
  const selectPostcode = (result: PostcodeResult) => {
    setPostcode(result.postcode); // Confirm selection
    setShowSearch(false);
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
  if (!postcode || postcode.trim() === "") {
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
    postcode: postcode, // ✅ Use the string value
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
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="SW1A 1AA"
              className="w-full border px-2 py-1 rounded text-sm"
              onFocus={() => {
  if (postcode.length > 2 && searchResults.length > 0) {
    setShowSearch(true);
  }
}}
onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            />
            {showSearch && searchResults.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                {searchResults.map((res, i) => (
                  <li
                    key={i}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => selectPostcode(res)}
                  >
                    {res.postcode} (£{res.deliveryFee} fee)
                  </li>
                ))}
              </ul>
            )}

        {/* Clear Button */}
        {postcode && (
          <button
            type="button"
            onClick={() => {
              setPostcode("");
                          
              setFormData((prev) => ({ ...prev, address: "" }));
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}

        {/* Selection Indicator */}
        {postcode && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-green-500">✓</span>
        )}
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
  );
}