import React from 'react';

const BookHistoryList = ({ books = [], type = 'donated' }) => {
  if (!books.length) return <p className="text-gray-500">No records found.</p>;

  return (
    <div className="space-y-3">
      {books.map((book) => {
        const date =
          book.updatedAt || book.createdAt || book.date || new Date().toISOString();

        let partnerName = 'Unknown';
        if (type === 'donated') {
          partnerName = book?.donatedTo?.name || book?.donatedTo?.email || 'Recipient';
        } else if (type === 'requested') {
          partnerName = book?.owner?.name || 'Donor';
        }

        return (
          <div key={book._id} className="border rounded-lg p-3 shadow-sm">
            <h3 className="text-lg font-semibold">{book.title}</h3>

            {book.status && (
              <p>
                Status: <span className="text-blue-500">{book.status}</span>
              </p>
            )}

            <p>Date: {new Date(date).toLocaleDateString()}</p>

            {partnerName && (
              <p>
                {type === 'donated' ? 'To' : 'From'}: <span className="font-medium">{partnerName}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BookHistoryList;
