import './App.css';
import ImageUploadArea from './ImageUploadArea';
import { useState, useEffect, useCallback } from 'react';
import LandingPage from './LandingPage';
import AnalysisResults from './AnalysisResults';
import Loader from './Loader';
import { ReactLenis } from 'lenis/react';

// Backend API URL
const API_URL = 'http://localhost:5000/api';

// Interface for Flask backend response aligned with the Python implementation
interface PredictionResult {
  prediction: {
    class: string;
    confidence: number;
    readable_name: string;
    organ: string;
  };
  all_confidences: Record<string, number>;
  filename: string;
  meta: {
    organ: string;
    is_malignant: boolean;
  };
  visualizations: {
    bar_chart: string;
    organ_chart: string;
    pie_chart: string;
  };
}

function App() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [showResults, setShowResults] = useState<boolean>(false);
  
  // App loading state (separate from analysis loading)
  const [appLoading, setAppLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  
  // Memoize the current image file
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Check if the backend is running on component mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.model_loaded) {
            setServerStatus('online');
          } else {
            setServerStatus('error');
            setError("Backend is online but model is not loaded");
          }
        } else {
          setServerStatus('error');
          setError("Backend returned an error status");
        }
      } catch (err) {
        setServerStatus('offline');
        setError("Cannot connect to backend server");
      }
    };

    if (appLoading) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    checkServerStatus();
  }, [appLoading]);

  // This function handles the image selection - memoized to prevent unnecessary re-renders
  const handleImageSelected = useCallback((file: File | null) => {
    setCurrentFile(file);
    
    if (!file) {
      setPrediction(null);
      setShowResults(false);
      return;
    }
    
    // Clear previous results when a new image is selected
    setPrediction(null);
    setShowResults(false);
    setError(null);
  }, []);
  
  // Function to handle analysis when button is clicked - memoized
  const handleAnalyzeImage = useCallback(async (file: File) => {
    if (!file) {
      setError("Please select an image first");
      return;
    }

    // Check file type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'tiff'];

    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setError(`File type not allowed. Please upload: ${allowedExtensions.join(', ')}`);
      return;
    }

    // Check file size (10MB limit as per backend)
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size allowed is 10MB");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const result: PredictionResult = await response.json();
      setPrediction(result);
      setShowResults(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handler for brain model loading progress updates - memoized
  const handleLoadingProgress = useCallback((progress: number) => {
    setLoadingProgress(progress);
    
    // Only transition when truly at 100%
    if (progress >= 100) {
      // Small delay to ensure model has rendered
      setTimeout(() => {
        // Single timeout with reasonable delay
        setAppLoading(false);
      }, 500);
    }
  }, []);

  return (
    <ReactLenis root>
      {/* Main application loader */}
      <Loader 
        progress={loadingProgress} 
        isComplete={loadingProgress >= 100} 
        isVisible={appLoading}
      />
      
      {/* Main content (visible when loading completes) */}
      <div className={`app-content ${!appLoading ? 'visible' : ''}`}>
        <LandingPage 
          onLoadingProgress={handleLoadingProgress} 
        />
        
        {/* Image upload section */}
        <ImageUploadArea 
          onImageSelected={handleImageSelected}
          onAnalyzeImage={handleAnalyzeImage}
          loading={loading}
          currentFile={currentFile}
        />
        
        {/* Simple Analysis Loader */}
        {loading && (
          <div className="analysis-loader-container">
            <div style={{ textAlign: 'center' }}>
              <div className="circular-loader"></div>
              <div className="loader-text">Analyzing Image...</div>
            </div>
          </div>
        )}
        
        {/* Analysis Results component */}
        <AnalysisResults 
          prediction={prediction}
          loading={loading}
          error={error}
          showResults={showResults}
          serverStatus={serverStatus}
        />
      </div>
    </ReactLenis>
  );
}

export default App;