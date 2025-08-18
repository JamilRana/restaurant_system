// src/components/Admin/SearchBar.tsx

import { useEffect, useRef } from "react";

type SearchBarProps = {
  onSearch: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  onSearch,
  placeholder = "Search orders...",
}: SearchBarProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, 500); // 500ms delay
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={handleInputChange}
      className="border p-2 w-full rounded outline-none focus:border-blue-500 transition"
    />
  );
}
