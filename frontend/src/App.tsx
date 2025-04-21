import './App.css'
import ImageUploadArea from './ImageUploadArea'
import { useState, useEffect, JSX } from 'react';
import LandingPage from './LandingPage';
import AnalysisResults from './AnalysisResults';

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

function App(): JSX.Element {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [showResults, setShowResults] = useState<boolean>(false);

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

    checkServerStatus();
  }, []);

  const handleImageSelected = async (file: File | null) => {
    if (!file) {
      setPrediction(null);
      setShowResults(false);
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
    setPrediction(null);
    setShowResults(false);

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
  };

  return (
    <>
      <LandingPage/>
      
      {/* Image upload section */}
      <ImageUploadArea onImageSelected={handleImageSelected} />
      
      {/* Analysis Results component */}
      <AnalysisResults 
        prediction={prediction}
        loading={loading}
        error={error}
        showResults={showResults}
        serverStatus={serverStatus}
      />
    </>
  );
}

export default App;