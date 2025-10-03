import React, { useState, useRef } from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export default function App() {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayData, setDisplayData] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const allRowsRef = useRef([]); // ✅ full dataset here

  const isRowValid = (row) => {
    return !Object.values(row).some(
      (val) =>
        typeof val === "string" &&
        (val.includes("http://") || val.includes("https://"))
    );
  };

  const removeDuplicates = (rows) => {
    const seen = new Set();
    return rows.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setMessage("");
    setDisplayData([]);
    setCurrentFileIndex(0);
    setTotalFiles(e.target.files.length);
    allRowsRef.current = []; // ✅ reset full data
  };

  const processFile = async (file) => {
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

      const filteredData = jsonData.filter(isRowValid);

      // ✅ Add all data to the ref (not state)
      allRowsRef.current = allRowsRef.current.concat(filteredData);

      // ✅ Add preview to UI (first 500 rows max)
      if (displayData.length < 500) {
        const remainingSlots = 500 - displayData.length;
        const toAdd = filteredData.slice(0, remainingSlots);
        if (toAdd.length > 0) {
          setDisplayData((prev) => [...prev, ...toAdd]);
        }
      }

      setMessage(`Processed file: ${filename}`);
    }
  };

  const mergeExcelData = async () => {
    if (files.length === 0) {
      setMessage("Please select ZIP files first!");
      return;
    }

    setLoading(true);
    setMessage("Processing files...");

    try {
      for (const file of files) {
        await processFile(file);
        setCurrentFileIndex((prev) => prev + 1);
      }

      // ✅ Use ref to access all data
      const allData = removeDuplicates(allRowsRef.current);

      if (allData.length === 0) {
        setMessage("No valid data found.");
        setLoading(false);
        return;
      }

      const allHeaders = Object.keys(allData[0]);
      const worksheet = XLSX.utils.json_to_sheet(allData, { header: allHeaders });
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.csv";
      a.click();
      URL.revokeObjectURL(url);

      setMessage(`Downloaded ${allData.length.toLocaleString()} rows as CSV!`);
    } catch (err) {
      console.error(err);
      setMessage("Error merging files: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "50px auto", fontFamily: "Arial" }}>
      <h2>Merge Excel from ZIP (Chrome Supported)</h2>

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
              <li key={i}>{f.name} - {(f.size / 1024 / 1024).toFixed(2)} MB</li>
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

      {displayData.length > 0 && (
        <>
          <h4>Preview (First {displayData.length} Rows)</h4>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {Object.keys(displayData[0]).map((key) => (
                    <th key={key} style={{ border: "1px solid #ccc", padding: 4 }}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} style={{ border: "1px solid #ccc", padding: 4 }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
