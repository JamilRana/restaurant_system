// lib/exportCSV.ts
export function exportToCSV(data: any[], columns: string[], filename: string = "export") {
  const headers = columns;
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(field => JSON.stringify(row[field] || "")).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url); // Clean up
}