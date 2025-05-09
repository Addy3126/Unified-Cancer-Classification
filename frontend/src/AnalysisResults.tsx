import { useState, useCallback, useMemo, memo } from 'react';
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

// Cached organ categories for faster lookups
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

// Cached class labels for faster lookups - now using a Map for improved lookup performance
const classLabelsMap = new Map([
  ['all_benign', 'Benign (General)'],
  ['all_early', 'Early Stage Cancer'],
  ['all_pre', 'Pre-cancerous'],
  ['all_pro', 'Progressive Cancer'],
  ['brain_glioma', 'Brain Glioma'],
  ['brain_menin', 'Brain Meningioma'],
  ['brain_notumor', 'Brain - No Tumor'],
  ['brain_tumor', 'Brain Tumor'],
  ['breast_benign', 'Breast - Benign'],
  ['breast_malignant', 'Breast - Malignant'],
  ['cervix_dyk', 'Cervix Dyskeratosis'],
  ['cervix_koc', 'Cervix Koilocytosis'],
  ['cervix_mep', 'Cervix Metaplasia'],
  ['cervix_pab', 'Cervix Parabasal'],
  ['cervix_sfi', 'Cervix Superficial'],
  ['colon_aca', 'Colon Adenocarcinoma'],
  ['colon_bnt', 'Colon - Benign'],
  ['kidney_normal', 'Kidney - Normal'],
  ['kidney_tumor', 'Kidney Tumor'],
  ['lung_aca', 'Lung Adenocarcinoma'],
  ['lung_bnt', 'Lung - Benign'],
  ['lung_scc', 'Lung Squamous Cell Carcinoma'],
  ['lymph_cll', 'Lymphoma CLL'],
  ['lymph_fl', 'Lymphoma Follicular'],
  ['lymph_mcl', 'Lymphoma Mantle Cell'],
  ['oral_normal', 'Oral - Normal'],
  ['oral_scc', 'Oral Squamous Cell Carcinoma']
]);

// Precompute organ lookup - cached for all class names
const organLookupMap = new Map<string, string>();
Object.entries(organCategories).forEach(([organ, classes]) => {
  classes.forEach(className => {
    organLookupMap.set(className, organ);
  });
});

// Get organ from class name - optimized with Map
const getOrganFromClass = (className: string): string => {
  return organLookupMap.get(className) || "Other";
};

// Component for visualization tabs - memoized
interface VisualizationTabsProps {
  prediction: PredictionResult;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const VisualizationTabs: React.FC<VisualizationTabsProps> = memo(({ prediction, activeTab, setActiveTab }) => {
  // Memoize tab click handlers to prevent recreating functions on each render
  const setBarTab = useCallback(() => setActiveTab('bar'), [setActiveTab]);
  const setOrganTab = useCallback(() => setActiveTab('organ'), [setActiveTab]);
  const setPieTab = useCallback(() => setActiveTab('pie'), [setActiveTab]);
  
  // Pre-calculate image URLs
  const barChartUrl = useMemo(() => 
    `http://localhost:5000/visualizations/${prediction.visualizations.bar_chart}`,
    [prediction.visualizations.bar_chart]
  );
  
  const organChartUrl = useMemo(() => 
    `http://localhost:5000/visualizations/${prediction.visualizations.organ_chart}`,
    [prediction.visualizations.organ_chart]
  );
  
  const pieChartUrl = useMemo(() => 
    `http://localhost:5000/visualizations/${prediction.visualizations.pie_chart}`,
    [prediction.visualizations.pie_chart]
  );

  return (
    <div className="viz-tabs-container">
      <div className="viz-tabs-header">
        <button
          className={`viz-tab-button ${activeTab === 'bar' ? 'viz-tab-active' : 'viz-tab-inactive'}`}
          onClick={setBarTab}
        >
          <BarChart size={16} className="viz-tab-icon" /> Top Classes
        </button>
        <button
          className={`viz-tab-button ${activeTab === 'organ' ? 'viz-tab-active' : 'viz-tab-inactive'}`}
          onClick={setOrganTab}
        >
          <Activity size={16} className="viz-tab-icon" /> Organ Analysis
        </button>
        <button
          className={`viz-tab-button ${activeTab === 'pie' ? 'viz-tab-active' : 'viz-tab-inactive'}`}
          onClick={setPieTab}
        >
          <PieChart size={16} className="viz-tab-icon" /> Benign vs Malignant
        </button>
      </div>

      <div className="viz-tab-content">
        {activeTab === 'bar' && (
          <div className="viz-image-container">
            <img
              src={barChartUrl}
              alt="Top 5 Predictions Chart"
              className="viz-chart-image"
              loading="lazy"
            />
            <p className="viz-chart-caption">Top 5 classification results by confidence</p>
          </div>
        )}
        {activeTab === 'organ' && (
          <div className="viz-image-container">
            <img
              src={organChartUrl}
              alt="Organ Analysis Chart"
              className="viz-chart-image"
              loading="lazy"
            />
            <p className="viz-chart-caption">Highest confidence prediction by organ/region</p>
          </div>
        )}
        {activeTab === 'pie' && (
          <div className="viz-image-container">
            <img
              src={pieChartUrl}
              alt="Benign vs Malignant Chart"
              className="viz-chart-image"
              loading="lazy"
            />
            <p className="viz-chart-caption">Aggregate benign vs malignant probability assessment</p>
          </div>
        )}
      </div>
    </div>
  );
});

// Display name for debugging purposes
VisualizationTabs.displayName = 'VisualizationTabs';

// Optimized top predictions calculator using memoization
const useTopPredictions = (confidences: Record<string, number> | undefined, n: number = 5) => {
  return useMemo(() => {
    if (!confidences) return [];
    
    // Create array only once
    const entries = Object.entries(confidences);
    const mapped = new Array(entries.length);
    
    // Map in a single loop without creating intermediate objects
    for (let i = 0; i < entries.length; i++) {
      mapped[i] = { class: entries[i][0], confidence: entries[i][1] };
    }
    
    // Sort and slice
    return mapped
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, n);
  }, [confidences, n]);
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
  
  // Memoize the uploaded image URL
  const uploadedImageUrl = useMemo(() => {
    return prediction ? `http://localhost:5000/uploads/${prediction.filename}` : '';
  }, [prediction?.filename]);
  
  // Get top predictions using the custom hook
  const topPredictions = useTopPredictions(prediction?.all_confidences, 5);
  
  // Skip rendering completely if no results to show
  if (!showResults && !loading) {
    return null;
  }

  // Render the component - optimized to minimize conditional renders
  return (
    <div className="analysis-results-container">
      {/* Backend status indicator - uses memoized components */}
      <ServerStatusIndicator status={serverStatus} errorMessage={error} />

      {/* Results section */}
      <div className={`results-section ${showResults ? '' : 'hidden-section'}`}>
        <h2 className="results-title">Analysis Results</h2>
        {loading && <LoadingIndicator />}

        {error && !loading && <ErrorDisplay error={error} />}
        
        {prediction && !loading && (
          <div className="prediction-results">
            <div className="primary-prediction-outer">
              {/* Primary prediction result */}
              <PrimaryPrediction prediction={prediction} />

              {/* Show uploaded image if available */}
              {prediction && (
                <div className="uploaded-image-container">
                  {/* <h3 className="uploaded-image-title">Uploaded Image:</h3> */}
                  <div className="uploaded-image-wrapper">
                    <img
                      src={uploadedImageUrl}
                      alt="Uploaded for analysis"
                      className="uploaded-image"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
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
            <AlternativePredictions topPredictions={topPredictions} />

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

// Memoized sub-components for performance optimization

const ServerStatusIndicator = memo(({ status, errorMessage }: { 
  status: 'checking' | 'online' | 'offline' | 'error',
  errorMessage: string | null
}) => (
  <div className="server-status-container">
    {status === 'checking' && (
      <span className="server-status server-status-checking">
        <AlertTriangle size={16} className="server-status-icon" /> Checking server status...
      </span>
    )}
    {status === 'online' && (
      <span className="server-status server-status-online">
        <CheckCircle size={16} className="server-status-icon" /> Backend connected (ResNet152V2 model loaded)
      </span>
    )}
    {status === 'offline' && (
      <span className="server-status server-status-offline">
        <AlertCircle size={16} className="server-status-icon" /> Backend not available
      </span>
    )}
    {status === 'error' && (
      <span className="server-status server-status-error">
        <AlertCircle size={16} className="server-status-icon" /> Backend error: {errorMessage}
      </span>
    )}
  </div>
));

ServerStatusIndicator.displayName = 'ServerStatusIndicator';

const LoadingIndicator = memo(() => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p className="loading-text">Analyzing image with ResNet152V2 model...</p>
  </div>
));

LoadingIndicator.displayName = 'LoadingIndicator';

const ErrorDisplay = memo(({ error }: { error: string }) => (
  <div className="error-container">
    <div className="error-content">
      <AlertCircle size={20} className="error-icon" />
      <div>
        <h3 className="error-title">Error processing image</h3>
        <p className="error-message">{error}</p>
      </div>
    </div>
  </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

const PrimaryPrediction = memo(({ prediction }: { prediction: PredictionResult }) => (
  <div
    className={`primary-prediction ${
      prediction.meta.is_malignant
        ? 'primary-prediction-malignant'
        : 'primary-prediction-benign'
    }`}
  >
    <h1 className="primary-prediction-title">
      Classification: {prediction.prediction.readable_name}
    </h1>
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
));

PrimaryPrediction.displayName = 'PrimaryPrediction';

const AlternativePredictions = memo(({ topPredictions }: { 
  topPredictions: Array<{class: string, confidence: number}> 
}) => {
  // Filter out the first prediction and take next 3
  const alternativePreds = topPredictions.slice(1, 4);
  
  // Return null early if no alternatives
  if (alternativePreds.length === 0) return null;
  
  return (
    <div className="alternatives-section">
      <h3 className="alternatives-title">Alternative Classifications</h3>
      <div className="alternatives-list">
        {alternativePreds.map((pred, idx) => (
          <div key={idx} className="alternative-item">
            <div className="alternative-details">
              <span className="alternative-name">
                {classLabelsMap.get(pred.class) || pred.class}
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
  );
});

AlternativePredictions.displayName = 'AlternativePredictions';

// Export the memoized component
export default memo(AnalysisResults);