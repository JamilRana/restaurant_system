// app/components/Admin/ToggleButton.tsx
import { useEffect, useRef, useState } from "react";

type ToggleButtonProps = {
  value: string | number | boolean;
  onToggle: (value: string | number | boolean) => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function ToggleButton({
  value,
  onToggle,
  disabled = false,
  loading = false,
}: ToggleButtonProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external value changes (e.g., when parent updates)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setLocalValue(newValue);

    // Clear previous timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Debounce the update
    timeoutRef.current = setTimeout(() => {
      onToggle(newValue);
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
          <span>Updating...</span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              // Simulate checkbox toggle
              const newValue = !localValue;
              setLocalValue(newValue);

              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(() => {
                onToggle(newValue);
              }, 500);
            }}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${
              localValue ? "bg-indigo-600" : "bg-slate-300"
            } ${
              disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-900"
            }`}
            aria-label={localValue ? "Deactivate" : "Activate"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform  ${
                localValue ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </>
      )}
    </div>
  );
}
