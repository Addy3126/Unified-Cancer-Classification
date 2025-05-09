import React, { useState, useRef, ChangeEvent, DragEvent, useCallback, memo } from 'react';
import { Images, Eraser, AlertCircle, Play, RefreshCw } from 'lucide-react';
import './ImageUploadArea.css';

interface ImageUploadAreaProps {
  onImageSelected: (file: File | null) => void;
  onAnalyzeImage: (file: File) => void;
  analyzing: boolean;
  currentFile: File | null;
}

interface Thumbnail {
  name: string;
  url: string;
}

const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({ 
  onImageSelected, 
  onAnalyzeImage,
  analyzing,
  currentFile
}) => {
  const [selectedImage, setSelectedImage] = useState<Thumbnail | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Allowed file types for medical images
  const allowedTypes = ['image/jpeg', 'image/png', 'image/dicom', 'image/tiff'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // Memoize file change handler to prevent unnecessary re-renders
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  // Memoize drop handler
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Process the file with optimized validation
  const processFile = useCallback((file: File) => {
    setError(null);

    // Validate file type
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      setError('Please upload a valid medical image (JPEG, PNG, DICOM, or TIFF)');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setError('File size exceeds 10MB limit');
      return;
    }

    // Use URL.createObjectURL for more efficient memory usage
    const objectUrl = URL.createObjectURL(file);
    
    const thumb: Thumbnail = {
      name: file.name,
      url: objectUrl
    };

    setPreviewUrl(objectUrl);
    setSelectedImage(thumb);
    
    // Notify parent component about the file selection
    if (onImageSelected) {
      onImageSelected(file);
    }
  }, [onImageSelected]);

  // Clean up object URLs when component unmounts or when preview changes
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeImage = useCallback(() => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setSelectedImage(null);
    setPreviewUrl(null);
    
    if (onImageSelected) {
      onImageSelected(null);
    }
  }, [onImageSelected, previewUrl]);
  
  const handleAnalyzeClick = useCallback(() => {
    if (currentFile && onAnalyzeImage) {
      onAnalyzeImage(currentFile);
    }
  }, [currentFile, onAnalyzeImage]);

  return (
    <div className="inputConMainOuter" style={{position: 'relative',padding: '0 10%', width: '100%', marginTop: '100vh'}}>
      <div className="inputConMain">
        <div className="inputConInner">
          <div className="inputAreaContent">
            <h2 className="inputConMainTitle">Image Upload</h2>
            <p>Drag and drop your medical image here or click the input dialog to browse an image from device.</p>
            <br/>
            <p><b>Supported formats: JPEG, PNG (max 10MB)</b></p>
            <p className="uploadNote">Once your image is uploaded, click the <strong>Analyze Image</strong> button below to start processing.</p>
          </div>

          <div
            className={`mainUploadArea ${
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
                  className="preview-img"
                />
              </div>
            ) : (
              <>
                <Images className="inputImageIcon" />
                <p className="browse-text">
                  Click to browse
                </p>
                <p className="drop-text">
                  or drop files here
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="error-message">
            <AlertCircle size={16} className="error-icon" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Analysis Button */}
        {currentFile && (
          <div className="analyze-button-container">
            <button 
              className={`analyze-button ${analyzing ? 'analyzing' : ''}`}
              onClick={handleAnalyzeClick}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="analyze-icon spinning" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  <Play className="analyze-icon" />
                  Analyze Image
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="imageClearButton"
              disabled={analyzing}
              >
              <Eraser size={20} /> Clear Image
            </button>
          </div>
        )}
        
        {/* Analysis animation for the image area */}
        {analyzing && selectedImage && (
          <div className="image-scan-animation">
            <div className="scan-line"></div>
          </div>
        )}
      </div>
    </div>
  );
};

// Memo to prevent unnecessary re-renders
export default memo(ImageUploadArea);