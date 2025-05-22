// AnalysisResults.tsx
import { useState, useCallback, useMemo, memo } from 'react';import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  PieChart, 
  BarChart, 
  Activity, 
  Info, 
  List, 
  FileWarning, 
  Stethoscope, 
  Clock, 
  Heart,
  MapPin,
  Gauge
} from 'lucide-react';
import './AnalysisResults.css';

// Interface for alternative predictions
interface AlternativePrediction {
  readable_name: string;
  organ: string;
  confidence: number;
  brief_info: string;
}

// Interface for cancer information
interface CancerInfo {
  description: string;
  details: string;
  patient_implications: string;
  common_treatments: string;
}

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
  cancer_info?: CancerInfo;
  alternatives_info?: AlternativePrediction[];
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

  // Skip rendering completely if no results to show
  if (!showResults && !loading) {
    return null;
  }

  return (
    <div className="analysis-results-container">
      {/* Backend status indicator */}
      <ServerStatusIndicator status={serverStatus} errorMessage={error} />

      <div className={`results-section ${showResults ? '' : 'hidden-section'}`}>
        <h2 className="results-title">Analysis Results</h2>
        {loading && <LoadingIndicator />}

        {error && !loading && <ErrorDisplay error={error} />}

        {prediction && !loading && (
          <div className="prediction-results">
            <div className="primary-prediction-outer">
              <PrimaryPrediction prediction={prediction} />

              {prediction && (
                <div className="uploaded-image-container">
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

            {/* Medical Information Section */}
            {prediction.cancer_info && (
              <CancerInformationSection 
                cancerInfo={prediction.cancer_info} 
                isMalignant={prediction.meta.is_malignant} 
              />
            )}

            <div className="visualizations-section">
              <h3 className="visualizations-title">Visualizations</h3>
              <VisualizationTabs
                prediction={prediction}
                activeTab={activeVisTab}
                setActiveTab={setActiveVisTab}
              />
            </div>

            <AlternativePredictions alternatives={prediction.alternatives_info} />

            <div className="details-section">
              <h3 className="details-title">Analysis Details</h3>
              <p className="details-description">
                Note: This is an AI-assisted analysis using a ResNet152V2 model and should be reviewed by a medical professional.
                The system is trained to identify multiple tissue types and conditions across various organs.
              </p>
              <div className="disclaimer-note">
                <strong>Medical Disclaimer:</strong> This tool is designed to assist healthcare professionals and is not intended to replace professional medical advice, diagnosis, or treatment.
              </div>
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

// Cancer Information Section Component
const CancerInformationSection = memo(({
  cancerInfo
}: {
  cancerInfo: CancerInfo;
  isMalignant: boolean;
}) => (
  <div className="cancer-info-section">
    <h3 className="cancer-info-title">
      <Info size={20} className="cancer-info-icon" /> Medical Information
    </h3>
    <div className="cancer-info-grid">
      <div className="cancer-info-card">
        <h4 className="cancer-info-card-title">
          <FileWarning size={18} className="cancer-info-card-icon" />
          Description
        </h4>
        <p className="cancer-info-card-content">{cancerInfo.description}</p>
      </div>
      <div className="cancer-info-card">
        <h4 className="cancer-info-card-title">
          <Stethoscope size={18} className="cancer-info-card-icon" />
          Medical Details
        </h4>
        <p className="cancer-info-card-content">{cancerInfo.details}</p>
      </div>
      <div className="cancer-info-card">
        <h4 className="cancer-info-card-title">
          <Clock size={18} className="cancer-info-card-icon" />
          Patient Implications
        </h4>
        <p className="cancer-info-card-content">{cancerInfo.patient_implications}</p>
      </div>
      <div className="cancer-info-card">
        <h4 className="cancer-info-card-title">
          <Heart size={18} className="cancer-info-card-icon" />
          Common Treatment Options
        </h4>
        <p className="cancer-info-card-content">{cancerInfo.common_treatments}</p>
      </div>
    </div>
  </div>
));

CancerInformationSection.displayName = 'CancerInformationSection';

// Memoized sub-components for performance optimization

const ServerStatusIndicator = memo(({ status, errorMessage }: {
  status: 'checking' | 'online' | 'offline' | 'error';
  errorMessage: string | null;
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

const PrimaryPrediction = memo(({ prediction }: { prediction: PredictionResult }) => {
  const isMalignant = prediction.meta.is_malignant;
  const Icon = isMalignant ? AlertTriangle : CheckCircle;
  const assessmentText = isMalignant ? 'Potentially Malignant' : 'Likely Benign';

  return (
    <div
      className={`primary-prediction ${
        isMalignant
          ? 'primary-prediction-malignant'
          : 'primary-prediction-benign'
      }`}
    >
      <h1 className="primary-prediction-title">
        <Icon size={24} className="primary-prediction-icon" />
        Results: {prediction.prediction.readable_name}
      </h1>
      <p className="primary-prediction-organ">
        <MapPin size={20} className="primary-prediction-icon" />
        Organ/Region: {prediction.prediction.organ}
      </p>
      <p className="primary-prediction-assessment">
        <Activity size={20} className="primary-prediction-icon" />
        Assessment: {assessmentText}
      </p>
      <div className="confidence-container">
        <div className="confidence-header">
          <span>
            <Gauge size={18} className="primary-prediction-icon" />
            Confidence:
          </span>
          <span>{Math.round(prediction.prediction.confidence * 100)}%</span>
        </div>
        <div className="confidence-bar-background">
          <div
            className={`confidence-bar-fill ${
              isMalignant
                ? 'confidence-bar-malignant'
                : 'confidence-bar-benign'
            }`}
            style={{ width: `${prediction.prediction.confidence * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
});

PrimaryPrediction.displayName = 'PrimaryPrediction';

// Updated AlternativePredictions component
const AlternativePredictions = memo(({ alternatives }: {
  alternatives: AlternativePrediction[] | undefined;
}) => {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="alternatives-section">
      <h3 className="alternatives-title">
        <List size={18} style={{ marginRight: '8px' }} />
        Alternative Classifications
      </h3>
      <div className="alternatives-list">
        {alternatives.map((alt, idx) => (
          <div key={idx} className="alternative-item">
            <div className="alternative-details">
              <span className="alternative-name">
                {alt.readable_name}
              </span>
              <span className="alternative-organ">
                ({alt.organ})
              </span>
            </div>
            <span className="alternative-confidence">
              {Math.round(alt.confidence * 100)}%
            </span>
          </div>
        ))}
        {alternatives.length > 0 && (
          <div style={{
            marginTop: '12px',
            fontSize: '0.9rem',
            backgroundColor: 'rgba(255, 250, 240, 0.6)',
            padding: '8px',
            borderRadius: '8px',
            borderLeft: '3px solid #f59e0b'
          }}>
            <strong>Note:</strong> {alternatives[0].brief_info}
          </div>
        )}
      </div>
    </div>
  );
});

AlternativePredictions.displayName = 'AlternativePredictions';

export default memo(AnalysisResults);