import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setMessage("");
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select ZIP files first!");
      return;
    }

    setUploading(true);
    setMessage("");
    const formData = new FormData();
    files.forEach(file => formData.append("file", file)); // ✅ use "file"

    try {
      const response = await fetch("http://localhost:5000/upload-zip", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.csv"; // ✅ CSV download
      document.body.appendChild(a);
      a.click();
      a.remove();

      setMessage("Files merged and downloaded successfully!");
      setFiles([]);
    } catch (err) {
      console.error(err);
      setMessage("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow">
        <h3 className="card-title mb-3">Upload ZIP Files (with Excel files inside)</h3>

        <div className="mb-3">
          <label htmlFor="fileInput" className="form-label">Select ZIP Files:</label>
          <input
            id="fileInput"
            type="file"
            multiple
            accept=".zip"
            className="form-control"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        {files.length > 0 && (
          <div className="mb-3">
            <h5>Selected Files:</h5>
            <ul className="list-group">
              {files.map((f, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                  {f.name}
                  <span className="badge bg-primary rounded-pill">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="btn btn-success"
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
        >
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Uploading...
            </>
          ) : "Upload & Merge"}
        </button>

        {message && (
          <div className="alert alert-info mt-3" role="alert">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
