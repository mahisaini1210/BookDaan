import React, { useEffect, useRef, useState, useContext } from 'react';
import axios from 'axios';
import BookCard from '../components/BookCard';
import Lottie from 'lottie-react';
import bookExchange from '../assets/book-exchange.json';
import { AuthContext } from '../context/AuthContext'; // ✅ Added

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Home = () => {
  const { userId } = useContext(AuthContext); // ✅ Get currentUserId from context

  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [filters, setFilters] = useState({
    q: '',
    location: '',
    subject: '',
    genre: '',
    language: '',
    condition: '',
    status: '',
    sort: 'recent',
    page: 1,
    limit: 9,
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedFilters(filters), 500);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/books/search`, {
        params: debouncedFilters,
      });
      setBooks(res.data.books);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [debouncedFilters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      q: '',
      location: '',
      subject: '',
      genre: '',
      language: '',
      condition: '',
      status: '',
      sort: 'recent',
      page: 1,
      limit: 9,
    });
  };

  const totalPages = Math.ceil(total / filters.limit);
  const goToPage = (page) => setFilters((prev) => ({ ...prev, page }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 px-4 sm:px-6 py-10">
      <div className="max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="animate-fade-in-down text-center mb-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800">
            📚 Discover Books Shared Near You
          </h2>
        </div>

        {/* Animation */}
        <div className="flex justify-center mb-10">
          <div className="w-52 sm:w-64">
            <Lottie animationData={bookExchange} loop />
          </div>
        </div>

        {/* Basic Filters */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input name="q" placeholder="🔍 Search by title, author, ISBN" value={filters.q} onChange={handleFilterChange} className="input" />
          <input name="location" placeholder="🌍 Filter by location" value={filters.location} onChange={handleFilterChange} className="input" />
          <input name="subject" placeholder="📚 Filter by subject" value={filters.subject} onChange={handleFilterChange} className="input" />
        </section>

        {/* Toggle Advanced Filters */}
        <div className="text-center mb-4">
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-blue-700 font-medium hover:underline">
            {showAdvanced ? 'Hide Advanced Filters ⬆' : 'Show Advanced Filters ⬇'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <input name="genre" placeholder="🎭 Genre" value={filters.genre} onChange={handleFilterChange} className="input" />
            <input name="language" placeholder="🈯 Language" value={filters.language} onChange={handleFilterChange} className="input" />
            <select name="condition" value={filters.condition} onChange={handleFilterChange} className="input">
              <option value="">📦 Condition</option>
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Acceptable">Acceptable</option>
            </select>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="input">
              <option value="">📌 Status</option>
              <option value="Available">Available</option>
              <option value="Requested">Requested</option>
              <option value="Donated">Donated</option>
            </select>
          </section>
        )}

        {/* Sorting and Stats */}
        <div className="flex flex-wrap justify-center items-center gap-6 mb-10">
          <select name="sort" value={filters.sort} onChange={handleFilterChange} className="input">
            <option value="recent">🔃 Sort By</option>
            <option value="recent">📅 Newest First</option>
            <option value="oldest">📆 Oldest First</option>
            <option value="az">🔤 Title A–Z</option>
            <option value="za">🔡 Title Z–A</option>
          </select>
          <button onClick={resetFilters} className="bg-red-100 hover:bg-red-200 text-red-700 font-medium px-4 py-2 rounded-lg">
            🔁 Reset Filters
          </button>
          <p className="text-sm text-gray-600">{total} result{total !== 1 && 's'} found</p>
        </div>

        {/* Book List */}
        <section>
          {loading ? (
            <p className="text-center text-blue-500 text-lg animate-pulse mt-10">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-center text-gray-500 text-lg mt-10">No books match your filters.</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book, i) => (
                <div key={book._id} style={{ animationDelay: `${i * 100}ms` }} className="animate-fade-in-up opacity-0 animation-fill-forwards">
                  <BookCard book={book} currentUserId={userId} /> {/* ✅ Pass userId */}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button
              onClick={() => goToPage(filters.page - 1)}
              disabled={filters.page === 1}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              ⬅ Prev
            </button>
            <span className="text-gray-700 font-medium">Page {filters.page} of {totalPages}</span>
            <button
              onClick={() => goToPage(filters.page + 1)}
              disabled={filters.page >= totalPages}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Next ➡
            </button>
          </div>
        )}
      </div>

      {/* Styles */}
      <style>
        {`
          .input {
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            border: 1px solid #cbd5e1;
            background-color: #fff;
            color: #1e293b;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: all 0.2s ease-in-out;
          }
          .input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59,130,246,0.3);
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-down { animation: fadeInDown 0.6s ease-out both; }
          .animate-fade-in-up { animation: fadeInUp 0.7s ease-out both; }
          .animation-fill-forwards { animation-fill-mode: forwards; }
        `}
      </style>
    </div>
  );
};

export default Home;
