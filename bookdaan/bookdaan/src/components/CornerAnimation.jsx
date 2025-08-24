import React from 'react';
import Lottie from 'lottie-react';
import boyReading from '../assets/boy-reading.json';

const CornerAnimation = () => (
  <div className="fixed bottom-0 right-0 w-48 h-48 pointer-events-none opacity-80 z-10">
    <Lottie animationData={boyReading} loop={true} />
  </div>
);

export default CornerAnimation;
