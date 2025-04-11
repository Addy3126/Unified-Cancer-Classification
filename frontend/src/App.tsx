import './App.css'
import ImageUploadArea from './ImageUploadArea'
import { useState, useEffect, JSX } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, PieChart, BarChart, Activity } from 'lucide-react';
import LandingPage from './LandingPage';

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

// Class groups for categorization - matching the Python backend
const organCategories: Record<string, string[]> = {
  'Brain': ['brain_glioma', 'brain_menin', 'brain_notumor', 'brain_tumor'],
  'Breast': ['breast_benign', 'breast_malignant'],
  'Cervix': ['cervix_dyk', 'cervix_koc', 'cervix_mep', 'cervix_pab', 'cervix_sfi'],
  'Colon': ['colon_aca', 'colon_bnt'],
  'Kidney': ['kidney_normal', 'kidney_tumor'],
  'Lung': ['lung_aca', 'lung_bnt', 'lung_scc'],
  'Lymph': ['lymph_cll', 'lymph_fl', 'lymph_mcl'],
  'Oral': ['oral_normal', 'oral_scc'],
  'General': ['all_benign', 'all_early', 'all_pre', 'all_pro']
};

// Readable class names - matching the Python backend
const classLabels: Record<string, string> = {
  'all_benign': 'Benign (General)',
  'all_early': 'Early Stage Cancer',
  'all_pre': 'Pre-cancerous',
  'all_pro': 'Progressive Cancer',
  'brain_glioma': 'Brain Glioma',
  'brain_menin': 'Brain Meningioma',
  'brain_notumor': 'Brain - No Tumor',
  'brain_tumor': 'Brain Tumor',
  'breast_benign': 'Breast - Benign',
  'breast_malignant': 'Breast - Malignant',
  'cervix_dyk': 'Cervix Dyskeratosis',
  'cervix_koc': 'Cervix Koilocytosis',
  'cervix_mep': 'Cervix Metaplasia',
  'cervix_pab': 'Cervix Parabasal',
  'cervix_sfi': 'Cervix Superficial',
  'colon_aca': 'Colon Adenocarcinoma',
  'colon_bnt': 'Colon - Benign',
  'kidney_normal': 'Kidney - Normal',
  'kidney_tumor': 'Kidney Tumor',
  'lung_aca': 'Lung Adenocarcinoma',
  'lung_bnt': 'Lung - Benign',
  'lung_scc': 'Lung Squamous Cell Carcinoma',
  'lymph_cll': 'Lymphoma CLL',
  'lymph_fl': 'Lymphoma Follicular',
  'lymph_mcl': 'Lymphoma Mantle Cell',
  'oral_normal': 'Oral - Normal',
  'oral_scc': 'Oral Squamous Cell Carcinoma'
};

// Determine if a class is likely malignant - matching Python backend logic
const isMalignantClass = (className: string): boolean => {
  const benignClasses = [
    'all_benign', 'brain_notumor', 'breast_benign',
    'colon_bnt', 'kidney_normal', 'lung_bnt', 'oral_normal'
  ];
  return !benignClasses.includes(className);
};

// Get organ from class name
const getOrganFromClass = (className: string): string => {
  for (const [organ, classes] of Object.entries(organCategories)) {
    if (classes.includes(className)) {
      return organ;
    }
  }
  return "Other";
};

// Component for visualization tabs
interface VisualizationTabsProps {
  prediction: PredictionResult;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const VisualizationTabs: React.FC<VisualizationTabsProps> = ({ prediction, activeTab, setActiveTab }) => {
  return (
    <div className="mb-4">
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'bar' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('bar')}
        >
          <BarChart size={16} className="mr-1" /> Top Classes
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'organ' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('organ')}
        >
          <Activity size={16} className="mr-1" /> Organ Analysis
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'pie' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('pie')}
        >
          <PieChart size={16} className="mr-1" /> Benign vs Malignant
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'bar' && (
          <div className="flex flex-col items-center">
            <img
              src={`http://localhost:5000/visualizations/${prediction.visualizations.bar_chart}`}
              alt="Top 5 Predictions Chart"
              className="w-full max-w-md"
            />
            <p className="text-sm text-gray-500 mt-2">Top 5 classification results by confidence</p>
          </div>
        )}
        {activeTab === 'organ' && (
          <div className="flex flex-col items-center">
            <img
              src={`http://localhost:5000/visualizations/${prediction.visualizations.organ_chart}`}
              alt="Organ Analysis Chart"
              className="w-full max-w-md"
            />
            <p className="text-sm text-gray-500 mt-2">Highest confidence prediction by organ/region</p>
          </div>
        )}
        {activeTab === 'pie' && (
          <div className="flex flex-col items-center">
            <img
              src={`http://localhost:5000/visualizations/${prediction.visualizations.pie_chart}`}
              alt="Benign vs Malignant Chart"
              className="w-full max-w-md"
            />
            <p className="text-sm text-gray-500 mt-2">Aggregate benign vs malignant probability assessment</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Get top N highest predictions
const getTopPredictions = (confidences: Record<string, number> | undefined, n: number = 5): Array<{class: string, confidence: number}> => {
  if (!confidences) return [];

  return Object.entries(confidences)
    .map(([className, confidence]) => ({ class: className, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, n);
};

function App(): JSX.Element {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('checking');
  const [activeVisTab, setActiveVisTab] = useState<string>('bar');
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
      setActiveVisTab('bar'); // Reset to default tab
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
            <h1 className="text-3xl font-bold text-gray-900">Medical Image Analysis System</h1>
            <p className="text-gray-600 mt-2">
              Upload medical images for AI-powered tissue classification and cancer detection
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
                  <CheckCircle size={16} className="mr-1" /> Backend connected (ResNet152V2 model loaded)
                </span>
              )}
              {serverStatus === 'offline' && (
                <span className="text-red-500 flex items-center text-sm">
                  <AlertCircle size={16} className="mr-1" /> Backend not available
                </span>
              )}
              {serverStatus === 'error' && (
                <span className="text-red-500 flex items-center text-sm">
                  <AlertCircle size={16} className="mr-1" /> Backend error: {error}
                </span>
              )}
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8">
            {/* Image upload section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <ImageUploadArea onImageSelected={handleImageSelected} />

              {/* Show uploaded image if available */}
              {prediction && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Uploaded Image:</h3>
                  <div className="border rounded-md overflow-hidden">
                    <img
                      src={`http://localhost:5000/uploads/${prediction.filename}`}
                      alt="Uploaded for analysis"
                      className="max-w-md mx-auto h-64 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Results section */}
            <div className={`bg-white p-6 rounded-lg shadow-md ${showResults ? '' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Analysis Results</h2>

              {loading && (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Analyzing image with ResNet152V2 model...</p>
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
                  {/* Primary prediction result */}
                  <div
                    className={`p-4 rounded-md ${
                      prediction.meta.is_malignant
                        ? 'bg-red-50 text-red-800'
                        : 'bg-green-50 text-green-800'
                    }`}
                  >
                    <h3 className="font-medium text-lg">
                      {prediction.prediction.readable_name}
                    </h3>
                    <p className="text-sm mt-1">
                      Organ/Region: {prediction.prediction.organ}
                    </p>
                    <p className="text-sm mt-1">
                      Assessment: {prediction.meta.is_malignant ? 'Potentially Malignant' : 'Likely Benign'}
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between mb-1">
                        <span>Confidence:</span>
                        <span>{Math.round(prediction.prediction.confidence * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            prediction.meta.is_malignant
                              ? 'bg-red-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${prediction.prediction.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Visualization tabs */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-3">Visualizations</h3>
                    <VisualizationTabs
                      prediction={prediction}
                      activeTab={activeVisTab}
                      setActiveTab={setActiveVisTab}
                    />
                  </div>

                  {/* Top 3 alternative predictions */}
                  <div>
                    <h3 className="font-medium mb-2">Alternative Classifications</h3>
                    <div className="space-y-2">
                      {getTopPredictions(prediction.all_confidences, 5)
                        .filter((_, index) => index > 0) // Skip the top one as it's already shown
                        .slice(0, 3) // Show only next 3 alternatives
                        .map((pred, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div>
                              <span className="text-gray-800">
                                {classLabels[pred.class] || pred.class}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({getOrganFromClass(pred.class)})
                              </span>
                            </div>
                            <span className="text-gray-600">
                              {Math.round(pred.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Additional information */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">Analysis Details</h3>
                    <p className="text-sm text-gray-500 mt-2 italic">
                      Note: This is an AI-assisted analysis using a ResNet152V2 model and should be reviewed by a medical professional.
                      The system is trained to identify multiple tissue types and conditions across various organs.
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