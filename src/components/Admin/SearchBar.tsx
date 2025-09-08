import { useEffect, useRef, useState } from "react";

type SearchBarProps = {
  onSearch: (value: string) => void;
  placeholder?: string;
  defaultValue?: string; // allow parent to pass current search
};

export default function SearchBar({
  onSearch,
  placeholder = "Search orders...",
  defaultValue = "",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      onSearch(newValue);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={value} // controlled input
        placeholder={placeholder}
        onChange={handleInputChange}
        className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-300 rounded-xl 
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                   transition-all text-slate-700 placeholder-slate-500"
      />
      <svg
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
}
