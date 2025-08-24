import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EditBook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [book, setBook] = useState({
    title: '',
    author: '',
    subject: '',
    classLevel: '',
    location: '',
    contact: '',
    cover: '',
    isbn: '',
    genre: '',
    bookLanguage: '', // ✅ updated key
    condition: 'Good',
  });

  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/books/${id}`);
        setBook((prev) => ({ ...prev, ...res.data }));
      } catch (err) {
        console.error('Error fetching book:', err);
        alert('❌ Failed to load book details.');
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBook((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleRemoveCover = () => {
    setBook((prev) => ({ ...prev, cover: '' }));
    setImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return alert('❌ You must be logged in to update.');

    try {
      let coverPath = book.cover;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await axios.post(`${API_BASE}/api/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        coverPath = uploadRes.data.imageUrl;
      }

      const updatedBook = { ...book, cover: coverPath };

      await axios.put(`${API_BASE}/api/books/${id}`, updatedBook, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('✅ Book updated successfully.');
      navigate(`/book/${id}`);
    } catch (err) {
      console.error('Update error:', err);
      alert('❌ Failed to update book.');
    }
  };

  const formFields = [
    { label: 'Title', name: 'title', required: true },
    { label: 'Author', name: 'author' },
    { label: 'Subject', name: 'subject' },
    { label: 'Class Level', name: 'classLevel' },
    { label: 'Location', name: 'location' },
    { label: 'Contact', name: 'contact' },
    { label: 'ISBN', name: 'isbn' },
    { label: 'Genre', name: 'genre' },
    { label: 'Language', name: 'bookLanguage' }, // ✅ updated field name
  ];

  if (loading) {
    return <p className="text-center text-gray-600 mt-10">Loading book details...</p>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-xl mt-10">
      <h2 className="text-2xl font-bold text-indigo-600 mb-6 text-center">✏️ Edit Book</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formFields.map(({ label, name, required }) => (
          <div key={name}>
            <label className="block font-medium mb-1">{label}</label>
            <input
              type="text"
              name={name}
              value={book[name] || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-md"
              required={required}
            />
          </div>
        ))}

        <div>
          <label className="block font-medium mb-1">Condition</label>
          <select
            name="condition"
            value={book.condition}
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded-md"
          >
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Acceptable">Acceptable</option>
          </select>
        </div>

        {book.cover && (
          <div>
            <p className="font-medium text-gray-700 mb-2">Current Cover:</p>
            <img
              src={`${API_BASE}${book.cover}`}
              alt="Book cover"
              className="w-32 h-auto rounded-md border mb-2"
            />
            <button
              type="button"
              onClick={handleRemoveCover}
              className="text-sm text-red-600 hover:underline"
            >
              Remove Cover
            </button>
          </div>
        )}

        <div>
          <label className="block font-medium mb-1">Upload New Cover</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border border-gray-300 p-2 rounded-md bg-gray-50"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-md transition"
        >
          💾 Update Book
        </button>
      </form>
    </div>
  );
};

export default EditBook;
