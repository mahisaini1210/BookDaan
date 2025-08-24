import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed for CORS
    image.src = url;
  });
}

// Utility to get the cropped image as a blob/file
async function getCroppedImg(imageSrc, crop, zoom) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const size = 200; // Output size (square)
  canvas.width = size;
  canvas.height = size;

  // Calculate cropping area in the original image coordinates
  const cropX = crop.x;
  const cropY = crop.y;

  // Because react-easy-crop gives crop in percentages, we need to calculate pixels:
  // Actually, react-easy-crop crop is in percentages, but we will simplify and
  // use getCroppedAreaPixels from react-easy-crop to get pixels.

  return new Promise((resolve, reject) => {
    // We'll use react-easy-crop's getCroppedAreaPixels function in the parent,
    // but for simplicity here, we assume you send cropped pixels instead of percentages.

    reject(new Error('This utility needs cropping pixel coordinates from parent component'));
  });
}

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Called when cropping done, gives cropped area pixels
  const onCropCompleteHandler = useCallback(
    (croppedArea, croppedAreaPixels) => {
      onCropComplete(croppedAreaPixels, zoom);
    },
    [onCropComplete, zoom]
  );

  return (
    <div className="relative w-full h-80 bg-gray-100 rounded overflow-hidden">
      <Cropper
        image={imageSrc}
        crop={crop}
        zoom={zoom}
        aspect={1}
        cropShape="round"  // circle crop
        showGrid={false}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropCompleteHandler}
      />

      {/* Zoom Slider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-3/4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded"
      >
        Cancel
      </button>
    </div>
  );
};

export default ImageCropper;
