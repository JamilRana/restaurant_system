// components/CSVExportButton.tsx
"use client";
import { CSVLink } from "react-csv";

interface CSVExportButtonProps {
  data: any[];
  headers: { label: string; key: string }[];
  filename: string;
}

export default function CSVExportButton({
  data,
  headers,
  filename,
}: CSVExportButtonProps) {
  return (
    <CSVLink
      data={data}
      headers={headers}
      filename={filename}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Export CSV
    </CSVLink>
  );
}
