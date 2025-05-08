import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, PieChart, BarChart, Activity } from 'lucide-react';
import './AnalysisResults.css';

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
    <div className="viz-tabs-container">
      <div className="viz-tabs-header">
        <button
          className={`viz-tab-button ${activeTab === 'bar' ? 'viz-tab-active' : 'viz-tab-inactive'}`}
          onClick={() => setActiveTab('bar')}
        >
          <BarChart size={16} className="viz-tab-icon" /> Top Classes
        </button>
        <button
          className={`viz-tab-button ${activeTab === 'organ' ? 'viz-tab-active' : 'viz-tab-inactive'}`}
          onClick={() => setActiveTab('organ')}
        >
          <Activity size={16} className="viz-tab-icon" /> Organ Analysis
        </button>
        <button
          className={`viz-tab-button ${activeTab === 'pie' ? 'viz-tab-active' : 'viz-tab-inactive'}`}
          onClick={() => setActiveTab('pie')}
        >
          <PieChart size={16} className="viz-tab-icon" /> Benign vs Malignant
        </button>
      </div>

      <div className="viz-tab-content">
        {activeTab === 'bar' && (
          <div className="viz-image-container">
            <img
              src={`http://localhost:5000/visualizations/${prediction.visualizations.bar_chart}`}
              alt="Top 5 Predictions Chart"
              className="viz-chart-image"
            />
            <p className="viz-chart-caption">Top 5 classification results by confidence</p>
          </div>
        )}
        {activeTab === 'organ' && (
          <div className="viz-image-container">
            <img
              src={`http://localhost:5000/visualizations/${prediction.visualizations.organ_chart}`}
              alt="Organ Analysis Chart"
              className="viz-chart-image"
            />
            <p className="viz-chart-caption">Highest confidence prediction by organ/region</p>
          </div>
        )}
        {activeTab === 'pie' && (
          <div className="viz-image-container">
            <img
              src={`http://localhost:5000/visualizations/${prediction.visualizations.pie_chart}`}
              alt="Benign vs Malignant Chart"
              className="viz-chart-image"
            />
            <p className="viz-chart-caption">Aggregate benign vs malignant probability assessment</p>
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

interface AnalysisResultsProps {
  prediction: PredictionResult | null;
  loading: boolean;
  error: string | null;
  showResults: boolean;
  serverStatus: 'checking' | 'online' | 'offline' | 'error';
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  prediction, 
  loading, 
  error, 
  showResults,
  serverStatus
}) => {
  const [activeVisTab, setActiveVisTab] = useState<string>('bar');

  return (
    <div className="analysis-results-container">
      {/* Backend status indicator */}
      <div className="server-status-container">
        {serverStatus === 'checking' && (
          <span className="server-status server-status-checking">
            <AlertTriangle size={16} className="server-status-icon" /> Checking server status...
          </span>
        )}
        {serverStatus === 'online' && (
          <span className="server-status server-status-online">
            <CheckCircle size={16} className="server-status-icon" /> Backend connected (ResNet152V2 model loaded)
          </span>
        )}
        {serverStatus === 'offline' && (
          <span className="server-status server-status-offline">
            <AlertCircle size={16} className="server-status-icon" /> Backend not available
          </span>
        )}
        {serverStatus === 'error' && (
          <span className="server-status server-status-error">
            <AlertCircle size={16} className="server-status-icon" /> Backend error: {error}
          </span>
        )}
      </div>

      <div className="app-sections">
        {/* Show uploaded image if available */}
        {prediction && (
          <div className="uploaded-image-container">
            <h3 className="uploaded-image-title">Uploaded Image:</h3>
            <div className="uploaded-image-wrapper">
              <img
                src={`http://localhost:5000/uploads/${prediction.filename}`}
                alt="Uploaded for analysis"
                className="uploaded-image"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results section */}
      <div className={`results-section ${showResults ? '' : 'hidden-section'}`}>
        <h2 className="results-title">Analysis Results</h2>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Analyzing image with ResNet152V2 model...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-content">
              <AlertCircle size={20} className="error-icon" />
              <div>
                <h3 className="error-title">Error processing image</h3>
                <p className="error-message">{error}</p>
              </div>
            </div>
          </div>
        )}

        {prediction && !loading && (
          <div className="prediction-results">
            {/* Primary prediction result */}
            <div
              className={`primary-prediction ${
                prediction.meta.is_malignant
                  ? 'primary-prediction-malignant'
                  : 'primary-prediction-benign'
              }`}
            >
              <h3 className="primary-prediction-title">
                {prediction.prediction.readable_name}
              </h3>
              <p className="primary-prediction-organ">
                Organ/Region: {prediction.prediction.organ}
              </p>
              <p className="primary-prediction-assessment">
                Assessment: {prediction.meta.is_malignant ? 'Potentially Malignant' : 'Likely Benign'}
              </p>
              <div className="confidence-container">
                <div className="confidence-header">
                  <span>Confidence:</span>
                  <span>{Math.round(prediction.prediction.confidence * 100)}%</span>
                </div>
                <div className="confidence-bar-background">
                  <div
                    className={`confidence-bar-fill ${
                      prediction.meta.is_malignant
                        ? 'confidence-bar-malignant'
                        : 'confidence-bar-benign'
                    }`}
                    style={{ width: `${prediction.prediction.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Visualization tabs */}
            <div className="visualizations-section">
              <h3 className="visualizations-title">Visualizations</h3>
              <VisualizationTabs
                prediction={prediction}
                activeTab={activeVisTab}
                setActiveTab={setActiveVisTab}
              />
            </div>

            {/* Top 3 alternative predictions */}
            <div className="alternatives-section">
              <h3 className="alternatives-title">Alternative Classifications</h3>
              <div className="alternatives-list">
                {getTopPredictions(prediction.all_confidences, 5)
                  .filter((_, index) => index > 0) // Skip the top one as it's already shown
                  .slice(0, 3) // Show only next 3 alternatives
                  .map((pred, idx) => (
                    <div key={idx} className="alternative-item">
                      <div className="alternative-details">
                        <span className="alternative-name">
                          {classLabels[pred.class] || pred.class}
                        </span>
                        <span className="alternative-organ">
                          ({getOrganFromClass(pred.class)})
                        </span>
                      </div>
                      <span className="alternative-confidence">
                        {Math.round(pred.confidence * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Additional information */}
            <div className="details-section">
              <h3 className="details-title">Analysis Details</h3>
              <p className="details-description">
                Note: This is an AI-assisted analysis using a ResNet152V2 model and should be reviewed by a medical professional.
                The system is trained to identify multiple tissue types and conditions across various organs.
              </p>
            </div>
          </div>
        )}

        {!prediction && !loading && !error && (
          <div className="empty-results">
            <p>Upload an image to see analysis results</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResults;