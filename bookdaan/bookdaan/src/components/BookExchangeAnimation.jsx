import React from 'react';
import Lottie from 'lottie-react';
import bookExchange from '../assets/book-exchange.json';

const BookExchangeAnimation = () => (
  <div className="fixed top-0 left-0 w-44 h-44 pointer-events-none opacity-80 z-10">
    <Lottie animationData={bookExchange} loop />
  </div>
);

export default BookExchangeAnimation;
