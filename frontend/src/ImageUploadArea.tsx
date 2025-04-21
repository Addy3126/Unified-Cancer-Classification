import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Images, Eraser, /*ZoomIn,*/ AlertCircle } from 'lucide-react';
import './ImageUploadArea.css'

interface ImageUploadAreaProps {
  onImageSelected: (file: File | null, previewUrl?: string | null) => void;
}

interface Thumbnail {
  name: string;
  url: string;
}

const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({ onImageSelected }) => {
  const [selectedImage, setSelectedImage] = useState<Thumbnail | null>(null); // Change to Thumbnail | null
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Allowed file types for medical images
  const allowedTypes = ['image/jpeg', 'image/png', 'image/dicom', 'image/tiff'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid medical image (JPEG, PNG, DICOM, or TIFF)');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setError('File size exceeds 10MB limit');
      return;
    }

    // Create thumbnail and preview
    const reader = new FileReader();
    reader.onload = () => {
      const thumb: Thumbnail = {
        name: file.name,
        url: reader.result as string,
      };

      setPreviewUrl(reader.result as string);
      setSelectedImage(thumb);

      // Add to thumbnails if not already present
      if (!thumbnails.some((thumb) => thumb.name === file.name)) {
        setThumbnails((prev) => [...prev, thumb].slice(-5)); // Keep only the 5 most recent thumbnails
      }

      // Notify parent component
      if (onImageSelected) {
        onImageSelected(file, reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // const selectThumbnail = (thumb: Thumbnail) => {
  //   setPreviewUrl(thumb.url);
  //   setSelectedImage(thumb);
  //   if (onImageSelected) {
  //     onImageSelected(null, thumb.url); // Pass null as the file and the URL for the thumbnail
  //   }
  // };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (onImageSelected) {
      onImageSelected(null);
    }
  };

  return (
    <>
      <img src=".\public\transparent.png" alt="transparent" style={{height:'100vh', width:'100%', pointerEvents:'none', zIndex:'-10'}}/>
      <div className=" inputConMain">
        <div className="inputAreaContent">
          <h2 className="inputConMainTitle">Image Upload</h2>
          <p>Drag and drop your medical image here or click the input dialog to browse an image from device.</p>
          <p>Supported formats: JPEG, PNG (max 10MB)</p>

            {/* Image details */}
            {selectedImage && (
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                <h2 style={{marginTop:"1.6em"}}>
                  Image Details
                </h2>
                <p>
                  <strong>File:</strong> {selectedImage.name}
                </p>
                {/* We don't have the full File object now, but we can display the name and URL */}
                <p><strong>Preview URL:</strong></p>
                <p style={{maxWidth:'500px', overflowX:'scroll'}}> {selectedImage.url}</p>
              </div>
            )}

        </div>

        {/* Main upload area */}
        <div className="mainUploadAreaCon">
          <div
            className={`mainUploadArea  ${
              isDragging ? 'inputDraggingTrue' : 'inputDraggingFalse'
            } mainUploadArea`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.dcm,.tiff"
              className="hidden"
            />

            {previewUrl ? (
              <div className="previewImage relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-none max-h-none w-auto h-auto"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  className="imageClearButton"
                >
                  <Eraser size={20} /> Clear Image
                </button>
              </div>
            ) : (
              <>
                <Images className="inputImageIcon" />
                <p className="text-[19px] font-[650] uppercase py-2 px-4 rounded-md">
                  Click to browse
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  or drop files here
                </p>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center text-red-500 bg-red-50 p-3 rounded">
            <AlertCircle size={16} className="mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Thumbnail gallery
        {thumbnails.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent uploads</h3>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {thumbnails.map((thumb, index) => (
                <div
                  key={index}
                  className={`relative h-16 w-16 rounded border overflow-hidden cursor-pointer ${
                    previewUrl === thumb.url ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => selectThumbnail(thumb)}
                >
                  <img
                    src={thumb.url}
                    alt={`Thumbnail ${index}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
                    <ZoomIn size={16} className="text-white opacity-0 hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}

      </div>
    </>
  );
};

export default ImageUploadArea;
