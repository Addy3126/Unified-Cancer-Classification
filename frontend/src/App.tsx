import './App.css'
import ImageUploadArea from './ImageUploadArea'
// App.tsx - Parent component that integrates with Flask backend
import { useState, useEffect, JSX } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import LandingPage from './LandingPage';

// Backend API URL
const API_URL = 'http://localhost:5000/api';

interface PredictionResult {
  prediction: {
    label: string;
    confidence: number;
    cancer_probability: number;
  };
  heatmap: string;
}

function App(): JSX.Element {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');

  // Check if the backend is running on component mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('error');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    };

    checkServerStatus();
  }, []);

  const handleImageSelected = async (file: File | null) => {
    if (!file) {
      setPrediction(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Cancer Detection System</h1>
            <p className="text-gray-600 mt-2">
              Upload medical images for AI-powered cancer detection
            </p>

            {/* Backend status indicator */}
            <div className="mt-2 flex justify-center items-center">
              {serverStatus === 'checking' && (
                <span className="text-yellow-500 flex items-center text-sm">
                  <AlertTriangle size={16} className="mr-1" /> Checking server status...
                </span>
              )}
              {serverStatus === 'online' && (
                <span className="text-green-500 flex items-center text-sm">
                  <CheckCircle size={16} className="mr-1" /> Backend connected
                </span>
              )}
              {serverStatus === 'offline' && (
                <span className="text-red-500 flex items-center text-sm">
                  <AlertCircle size={16} className="mr-1" /> Backend not available
                </span>
              )}
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image upload section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <ImageUploadArea onImageSelected={handleImageSelected} />
            </div>

            {/* Results section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Results</h2>

              {loading && (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Analyzing image with CNN model...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 p-4 rounded-md text-red-800">
                  <div className="flex">
                    <AlertCircle size={20} className="mr-2" />
                    <div>
                      <h3 className="font-medium">Error processing image</h3>
                      <p className="mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {prediction && !loading && (
                <div className="space-y-6">
                  {/* Prediction result */}
                  <div
                    className={`p-4 rounded-md ${
                      prediction.prediction.label === 'Malignant'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-green-50 text-green-800'
                    }`}
                  >
                    <h3 className="font-medium text-lg">{prediction.prediction.label}</h3>
                    <div className="mt-2">
                      <div className="flex justify-between mb-1">
                        <span>Confidence:</span>
                        <span>{Math.round(prediction.prediction.confidence * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            prediction.prediction.label === 'Malignant'
                              ? 'bg-red-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${prediction.prediction.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Heatmap visualization */}
                  <div>
                    <h3 className="font-medium mb-2">Regions of Interest</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Highlighted areas indicate regions the CNN model focused on for diagnosis:
                    </p>
                    <div className="border rounded-md overflow-hidden">
                      <img src={prediction.heatmap} alt="Analysis heatmap" className="w-full" />
                    </div>
                  </div>

                  {/* Additional information */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">Analysis Details</h3>
                    <p className="text-sm text-gray-600">
                      Cancer probability: {Math.round(prediction.prediction.cancer_probability * 1000) / 10}%
                    </p>
                    <p className="text-sm text-gray-500 mt-4 italic">
                      Note: This is an AI-assisted analysis and should be reviewed by a medical professional.
                    </p>
                  </div>
                </div>
              )}

              {!prediction && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <p>Upload an image to see analysis results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
