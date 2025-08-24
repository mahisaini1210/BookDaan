import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AddBook = () => {
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    subject: "",
    classLevel: "",
    location: "",
    contact: "",
    isbn: "",
    genre: "",
    bookLanguage: "", // ✅ Updated key
    condition: "Good",
  });

  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookData((prev) => ({
      ...prev,
      [name]: value.trimStart(), // prevents accidental space
    }));
  };

  const handleFileChange = (e) => {
    setCoverFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return alert("❌ You must be logged in to add a book.");

    setLoading(true);

    try {
      let imageUrl = "";
      if (coverFile) {
        const formData = new FormData();
        formData.append("image", coverFile);

        const uploadRes = await axios.post(`${API_BASE}/api/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        imageUrl = uploadRes.data.imageUrl;
      }

      const finalData = {
        ...bookData,
        cover: imageUrl,
      };

      await axios.post(`${API_BASE}/api/books`, finalData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("✅ Book added successfully");
      navigate("/");
    } catch (err) {
      console.error("Error adding book:", err);
      alert(err?.response?.data?.error || "❌ Failed to add book");
    } finally {
      setLoading(false);
    }
  };

  const fieldMeta = [
    { name: "title", required: true },
    { name: "author", required: true },
    { name: "subject" },
    { name: "classLevel" },
    { name: "location" },
    { name: "contact" },
    { name: "isbn" },
    { name: "genre" },
    { name: "bookLanguage" }, // ✅ Changed from 'language'
  ];

  return (
    <div className="max-w-xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">📚 Add a Book</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fieldMeta.map(({ name, required }) => (
          <div key={name}>
            <input
              type="text"
              name={name}
              placeholder={`Enter ${name}`}
              value={bookData[name]}
              onChange={handleChange}
              required={required}
              className="w-full px-4 py-2 border border-gray-300 rounded"
            />
          </div>
        ))}

        <div>
          <select
            name="condition"
            value={bookData.condition}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          >
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Acceptable">Acceptable</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            📷 Upload Cover (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Add Book"}
        </button>
      </form>
    </div>
  );
};

export default AddBook;
