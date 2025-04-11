# app.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import numpy as np
import cv2
from PIL import Image
import io
import base64
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import gradcam

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff'}
MODEL_PATH = 'model/model.h5'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max upload

# Load the CNN model
print("Loading CNN model...")
model = load_model(MODEL_PATH)
print("Model loaded successfully")
model.build(224)

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path, target_size=(224, 224)):
    """Preprocess image for model prediction"""
    img = Image.open(image_path)
    img = img.resize(target_size)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # Normalize
    return img_array

def generate_heatmap(image_path, target_size=(224, 224)):
    """Generate Grad-CAM heatmap"""
    # Load and preprocess image
    img = cv2.imread(image_path)
    img = cv2.resize(img, target_size)
    img_array = np.expand_dims(img, axis=0)
    img_array = img_array / 255.0
    
    # Generate heatmap using gradcam utility
    heatmap = gradcam.make_gradcam_heatmap(
        img_array,
        model,
        'conv2d_12',  # Last conv layer (adjust based on your model)
        pred_index=0  # Index for cancer class
    )
    
    # Create superimposed visualization
    heatmap = cv2.resize(heatmap, (img.shape[1], img.shape[0]))
    heatmap = np.uint8(255 * heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    
    superimposed_img = heatmap * 0.4 + img
    superimposed_img = np.clip(superimposed_img, 0, 255).astype('uint8')
    
    # Encode as base64
    _, buffer = cv2.imencode('.jpg', superimposed_img)
    heatmap_b64 = base64.b64encode(buffer).decode('utf-8')
    
    return heatmap_b64

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({"status": "ok", "model_loaded": model is not None})

@app.route('/api/predict', methods=['POST'])
def predict():
    """Process image and return cancer prediction"""
    # Check if image is present in request
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    
    # Check if filename is valid
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Preprocess image and make prediction
            preprocessed_img = preprocess_image(filepath)
            prediction = model.predict(preprocessed_img)
            
            # Generate heatmap
            heatmap_b64 = generate_heatmap(filepath)
            
            # Format results
            cancer_probability = float(prediction[0][0])
            result = {
                "prediction": {
                    "cancer_probability": cancer_probability,
                    "label": "Malignant" if cancer_probability > 0.5 else "Benign",
                    "confidence": cancer_probability if cancer_probability > 0.5 else 1 - cancer_probability
                },
                "heatmap": f"data:image/jpeg;base64,{heatmap_b64}",
                "filename": filename
            }
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "File type not allowed"}), 400

# Serve uploaded files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Create simple gradcam utility
@app.route('/api/gradcam_utils.py', methods=['GET'])
def gradcam_utils():
    with open('gradcam.py', 'r') as f:
        return f.read()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)