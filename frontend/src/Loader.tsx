import React from 'react';
import { Brain } from 'lucide-react';
import './Loader.css';

interface LoaderProps {
  progress: number;
  isComplete: boolean;
  isVisible: boolean;
}

const Loader: React.FC<LoaderProps> = ({ progress, isComplete, isVisible }) => {
    if (!isVisible) {
        return null; // Only check isVisible, not isComplete
    }

  return (
    <div className={`loader-screen ${isComplete ? 'fade-out' : ''}`}>
      <div className="loader-title">Unified Cancer Classification</div>
      <div className="loader-brain">
        <Brain size={64} color="#ed2d2d" />
      </div>
      <div className="loader-text">Loading...</div>
      <div className="loader-progress">
        <div
          className="loader-bar"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="loader-percentage">{progress}%</div>
    </div>
  );
};

export default Loader;