// components/PostcodeInput.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface PostcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  availablePostcodes: string[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function PostcodeInput({
  value,
  onChange,
  availablePostcodes,
  loading = false,
  placeholder = "Start typing postcode...",
  disabled = false,
}: PostcodeInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal input with external value (e.g. profile load)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter postcodes based on input
  const filteredPostcodes = useMemo(() => {
    if (loading || !availablePostcodes.length) return [];
    const input = inputValue.trim().toUpperCase();
    if (!input) return availablePostcodes;
    return availablePostcodes.filter((pc) => pc.toUpperCase().includes(input));
  }, [inputValue, availablePostcodes, loading]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onChange(value); // Notify parent immediately
    if (!loading) setIsOpen(true);
  };

  const handleSelect = (postcode: string) => {
    setInputValue(postcode);
    onChange(postcode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => !loading && !disabled && setIsOpen(true)}
        disabled={disabled || loading}
        placeholder={loading ? "Loading..." : placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
      />

      {/* Dropdown */}
      {!disabled && isOpen && !loading && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
          {filteredPostcodes.length > 0 ? (
            filteredPostcodes.map((pc) => (
              <li
                key={pc}
                onClick={() => handleSelect(pc)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                {pc}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-gray-500">No matching postcodes</li>
          )}
        </ul>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="animate-spin h-4 w-4 text-gray-500"
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
        </div>
      )}
    </div>
  );
}
