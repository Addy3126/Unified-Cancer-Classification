from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import matplotlib
matplotlib.use('Agg')  # Use a non-GUI backend to avoid Tkinter issues
import matplotlib.pyplot as plt
import io
import base64

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
VISUALIZATION_FOLDER = 'visualizations'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff'}
MODEL_PATH = 'model/resnet152V2_model.keras'

# Create necessary directories
for folder in [UPLOAD_FOLDER, VISUALIZATION_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['VISUALIZATION_FOLDER'] = VISUALIZATION_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max upload

# Class labels and category grouping
class_labels = [
    'all_benign', 'all_early', 'all_pre', 'all_pro',
    'brain_glioma', 'brain_menin', 'brain_notumor', 'brain_tumor',
    'breast_benign', 'breast_malignant',
    'cervix_dyk', 'cervix_koc', 'cervix_mep', 'cervix_pab', 'cervix_sfi',
    'colon_aca', 'colon_bnt',
    'kidney_normal', 'kidney_tumor',
    'lung_aca', 'lung_bnt', 'lung_scc',
    'lymph_cll', 'lymph_fl', 'lymph_mcl',
    'oral_normal', 'oral_scc'
]

# Organ categories
organ_categories = {
    'Brain': ['brain_glioma', 'brain_menin', 'brain_notumor', 'brain_tumor'],
    'Breast': ['breast_benign', 'breast_malignant'],
    'Cervix': ['cervix_dyk', 'cervix_koc', 'cervix_mep', 'cervix_pab', 'cervix_sfi'],
    'Colon': ['colon_aca', 'colon_bnt'],
    'Kidney': ['kidney_normal', 'kidney_tumor'],
    'Lung': ['lung_aca', 'lung_bnt', 'lung_scc'],
    'Lymph': ['lymph_cll', 'lymph_fl', 'lymph_mcl'],
    'Oral': ['oral_normal', 'oral_scc'],
    'General': ['all_benign', 'all_early', 'all_pre', 'all_pro']
}

# Readable class names
readable_class_names = {
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
}

# Load the CNN model
print("Loading CNN model...")
model = load_model(MODEL_PATH)
print("Model loaded successfully")
model.build((None, 224, 224, 3))


# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def preprocess_image(image_path, target_size=(224, 224)):
    """Preprocess image for model prediction"""
    img = Image.open(image_path).convert("RGB")
    img = img.resize(target_size)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # Normalize
    return img_array


def get_organ_from_class(class_name):
    """Get the organ category for a given class"""
    for organ, classes in organ_categories.items():
        if class_name in classes:
            return organ
    return "Other"


def create_visualization(prediction_data, filename_base):
    """Create visualization charts for prediction results"""
    visualizations = {}

    # 1. Top 5 Bar Chart
    plt.figure(figsize=(10, 6))
    top_indices = np.argsort(list(prediction_data['all_confidences'].values()))[-5:]
    top_classes = [class_labels[i] for i in top_indices]
    top_values = [prediction_data['all_confidences'][cls] for cls in top_classes]
    top_readable = [readable_class_names.get(cls, cls) for cls in top_classes]

    plt.barh(top_readable, top_values, color='skyblue')
    plt.xlabel('Confidence')
    plt.title('Top 5 Predictions')
    plt.tight_layout()

    # Save to binary stream
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    bar_vis_path = os.path.join(app.config['VISUALIZATION_FOLDER'], f"{filename_base}_bar.png")
    with open(bar_vis_path, 'wb') as f:
        f.write(buf.read())
    plt.close()

    # 2. Organ-wise Grouped Bar Chart
    plt.figure(figsize=(12, 8))

    # Group predictions by organ
    organs = {}
    for cls, conf in prediction_data['all_confidences'].items():
        organ = get_organ_from_class(cls)
        if organ not in organs:
            organs[organ] = []
        organs[organ].append((cls, conf))

    # Flatten for plotting
    organs_list = []
    organ_confs = []
    colors = []

    for organ, class_confs in organs.items():
        max_conf_class, max_conf = max(class_confs, key=lambda x: x[1])
        organs_list.append(organ)
        organ_confs.append(max_conf)
        colors.append('crimson' if max_conf_class in ['all_early', 'all_pre', 'all_pro',
                                                      'brain_glioma', 'brain_menin', 'brain_tumor',
                                                      'breast_malignant', 'cervix_dyk', 'cervix_koc',
                                                      'colon_aca', 'kidney_tumor', 'lung_aca', 'lung_scc',
                                                      'lymph_cll', 'lymph_fl', 'lymph_mcl',
                                                      'oral_scc'] else 'forestgreen')

    plt.barh(organs_list, organ_confs, color=colors)
    plt.xlabel('Max Confidence')
    plt.title('Organ-wise Highest Confidence')
    plt.tight_layout()

    # Save to binary stream
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    organ_vis_path = os.path.join(app.config['VISUALIZATION_FOLDER'], f"{filename_base}_organ.png")
    with open(organ_vis_path, 'wb') as f:
        f.write(buf.read())
    plt.close()

    # 3. Pie Chart for Malignant vs Benign
    plt.figure(figsize=(8, 8))

    # Calculate total malignant vs benign probability
    benign_classes = ['all_benign', 'brain_notumor', 'breast_benign', 'colon_bnt',
                      'kidney_normal', 'lung_bnt', 'oral_normal']

    benign_prob = sum(
        prediction_data['all_confidences'][cls] for cls in benign_classes if cls in prediction_data['all_confidences'])
    malignant_prob = sum(prediction_data['all_confidences'][cls] for cls in class_labels
                         if cls not in benign_classes and cls in prediction_data['all_confidences'])

    # Normalize to ensure they sum to 1
    total = benign_prob + malignant_prob
    if total > 0:
        benign_prob /= total
        malignant_prob /= total

    plt.pie([benign_prob, malignant_prob], labels=['Benign', 'Malignant/Abnormal'],
            colors=['forestgreen', 'crimson'], autopct='%1.1f%%', startangle=90)
    plt.axis('equal')
    plt.title('Benign vs Malignant Assessment')

    # Save to binary stream
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    pie_vis_path = os.path.join(app.config['VISUALIZATION_FOLDER'], f"{filename_base}_pie.png")
    with open(pie_vis_path, 'wb') as f:
        f.write(buf.read())
    plt.close()

    # Return all visualization paths
    visualizations = {
        'bar_chart': f"{filename_base}_bar.png",
        'organ_chart': f"{filename_base}_organ.png",
        'pie_chart': f"{filename_base}_pie.png"
    }

    return visualizations


# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({"status": "ok", "model_loaded": model is not None})


@app.route('/api/predict', methods=['POST'])
def predict():
    """Process image and return cancer prediction"""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            preprocessed_img = preprocess_image(filepath)
            prediction = model.predict(preprocessed_img)[0]  # shape: (27,)

            top_index = int(np.argmax(prediction))
            top_class = class_labels[top_index]
            top_confidence = float(prediction[top_index])

            class_confidences = {label: float(pred) for label, pred in zip(class_labels, prediction)}

            # Create base result object
            result = {
                "prediction": {
                    "class": top_class,
                    "confidence": top_confidence,
                    "readable_name": readable_class_names.get(top_class, top_class),
                    "organ": get_organ_from_class(top_class)
                },
                "all_confidences": class_confidences,
                "filename": filename,
                "meta": {
                    "organ": get_organ_from_class(top_class),
                    "is_malignant": top_class not in ['all_benign', 'brain_notumor', 'breast_benign',
                                                      'colon_bnt', 'kidney_normal', 'lung_bnt', 'oral_normal']
                }
            }

            # Create visualizations
            filename_base = filename.split('.')[0]
            visualizations = create_visualization(result, filename_base)
            result["visualizations"] = visualizations

            return jsonify(result)

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "File type not allowed"}), 400


# Serve static files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/visualizations/<filename>')
def visualization_file(filename):
    return send_from_directory(app.config['VISUALIZATION_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)