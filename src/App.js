import React, { useState } from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export default function App() {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Customize this function to filter unwanted rows
  function isRowValid(row) {
    // Example: exclude rows where any cell contains a URL (http:// or https://)
    return !Object.values(row).some(
      (val) =>
        typeof val === "string" &&
        (val.includes("http://") || val.includes("https://"))
    );
  }

  // Optional: Remove duplicate rows based on JSON string equality
  function removeDuplicates(rows) {
    const seen = new Set();
    return rows.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setMessage("");
  };

  const mergeExcelData = async () => {
    if (files.length === 0) {
      setMessage("Please select ZIP files first!");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      let allRows = [];
      let allHeadersSet = new Set();

      for (const file of files) {
        const zip = await JSZip.loadAsync(file);
        const excelFiles = Object.keys(zip.files).filter(
          (f) => f.endsWith(".xlsx") || f.endsWith(".xls")
        );

        for (const filename of excelFiles) {
          const fileData = await zip.files[filename].async("arraybuffer");
          const workbook = XLSX.read(fileData, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          // Filter unwanted rows
          const filteredData = jsonData.filter(isRowValid);

          // Collect headers from filtered rows
          filteredData.forEach((row) =>
            Object.keys(row).forEach((h) => allHeadersSet.add(h))
          );

          allRows = allRows.concat(filteredData);
        }
      }

      // Normalize rows with all headers
      const allHeaders = Array.from(allHeadersSet);
      const normalizedRows = allRows.map((row) => {
        const newRow = {};
        allHeaders.forEach((h) => {
          newRow[h] = row[h] !== undefined ? row[h] : "";
        });
        return newRow;
      });

      // Remove duplicates (optional)
      const uniqueRows = removeDuplicates(normalizedRows);

      // Convert to CSV
      const csv = XLSX.utils.sheet_to_csv(
        XLSX.utils.json_to_sheet(uniqueRows, { header: allHeaders })
      );

      // Trigger download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.csv";
      a.click();
      URL.revokeObjectURL(url);

      setMessage("Merged CSV downloaded successfully!");
      setFiles([]);
    } catch (err) {
      console.error(err);
      setMessage("Error merging files: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "50px auto", fontFamily: "Arial" }}>
      <h2>Upload ZIP files containing Excel to merge (frontend only)</h2>

      <input
        type="file"
        multiple
        accept=".zip"
        onChange={handleFileChange}
        disabled={loading}
      />

      {files.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>Selected Files:</h4>
          <ul>
            {files.map((f, i) => (
              <li key={i}>
                {f.name} - {(f.size / 1024 / 1024).toFixed(2)} MB
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={mergeExcelData}
        disabled={loading || files.length === 0}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Merging..." : "Merge & Download CSV"}
      </button>

      {message && (
        <p style={{ marginTop: 20, color: "green", fontWeight: "bold" }}>
          {message}
        </p>
      )}
    </div>
  );
}
