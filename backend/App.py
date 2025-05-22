# App.py
import os
import tensorflow as tf
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

# ============= GPU MEMORY MANAGEMENT =============
# Set memory growth to avoid OOM errors
physical_devices = tf.config.list_physical_devices('GPU')
if physical_devices:
    # Allow memory growth - prevents allocating all memory at once
    for device in physical_devices:
        try:
            tf.config.experimental.set_memory_growth(device, True)
            print(f"Memory growth enabled for {device}")
        except Exception as e:
            print(f"Error setting memory growth: {e}")
    
    # Optional: Limit GPU memory to a specific amount (in MB)
    try:
        tf.config.set_logical_device_configuration(
            physical_devices[0],
            [tf.config.LogicalDeviceConfiguration(memory_limit=4096)]  # Limit to 4GB
        )
        print("GPU memory limited to 4GB")
    except Exception as e:
        print(f"Error limiting GPU memory: {e}")
else:
    print("No GPU found, using CPU")
    os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Force CPU usage

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

# NEW: Cancer information database with details about each cancer type
cancer_information = {
    'all_benign': {
        'description': 'Benign tissues show normal cellular patterns with no signs of malignancy.',
        'details': 'Benign tissues typically maintain normal cell structure, controlled growth patterns, clear boundaries, and no invasion into surrounding tissues.',
        'patient_implications': 'Generally, benign findings suggest no cancer is present, though regular monitoring may be advised.',
        'common_treatments': 'Usually no treatment is necessary, but regular follow-up may be recommended.'
    },
    'all_early': {
        'description': 'Early stage cancer showing initial malignant transformation.',
        'details': 'Early-stage cancers typically exhibit some abnormal cell growth but remain localized, with limited spread beyond the original site.',
        'patient_implications': 'Early detection significantly improves treatment outcomes and survival rates.',
        'common_treatments': 'Surgery, targeted radiation therapy, and sometimes mild chemotherapy or immunotherapy regimens.'
    },
    'all_pre': {
        'description': 'Pre-cancerous tissue showing cellular changes that may develop into cancer if untreated.',
        'details': 'Pre-cancerous tissues show abnormal cellular growth that hasn\'t yet become malignant but carries risk of future malignancy.',
        'patient_implications': 'Intervention at this stage often prevents cancer development.',
        'common_treatments': 'Removal of abnormal tissue, lifestyle modifications, and close monitoring.'
    },
    'all_pro': {
        'description': 'Progressive cancer with significant malignant development.',
        'details': 'Progressive cancers show signs of advancement with increased cellular abnormality, potential metastasis, and invasion of surrounding tissues.',
        'patient_implications': 'Requires prompt intervention and comprehensive treatment strategy.',
        'common_treatments': 'May include surgery, systemic chemotherapy, radiation therapy, and targeted biological therapies.'
    },
    'brain_glioma': {
        'description': 'A tumor that originates in the brain\'s glial cells, which support and protect neurons.',
        'details': 'Gliomas account for about 30% of all brain tumors and 80% of malignant brain tumors. They form in the glial cells that surround nerve cells and help them function.',
        'patient_implications': 'Symptoms may include headaches, seizures, personality changes, and neurological deficits depending on tumor location.',
        'common_treatments': 'Surgery (when possible), radiation therapy, chemotherapy, and newer targeted therapies based on molecular profiling.'
    },
    'brain_menin': {
        'description': 'A typically slow-growing tumor that forms in the meninges, the layers of tissue covering the brain and spinal cord.',
        'details': 'Meningiomas make up about 30% of all brain tumors. Most are benign (90-95%), though some can be aggressive.',
        'patient_implications': 'May cause headaches, vision problems, or seizures depending on location. Small, asymptomatic meningiomas often require only monitoring.',
        'common_treatments': 'Observation for small, asymptomatic tumors; surgery for symptomatic or growing tumors; radiation for tumors that can\'t be completely removed.'
    },
    'brain_notumor': {
        'description': 'Normal brain tissue with no detectable neoplastic (tumor) presence.',
        'details': 'Normal brain tissue shows regular cellular architecture with appropriate neural and glial components.',
        'patient_implications': 'No evidence of brain tumor pathology in analyzed tissue.',
        'common_treatments': 'No tumor-directed treatments needed; follow-up may be recommended depending on clinical symptoms.'
    },
    'brain_tumor': {
        'description': 'An abnormal growth of cells in brain tissue, either malignant or benign.',
        'details': 'Brain tumors can arise from brain tissue itself (primary) or spread from cancers elsewhere in the body (secondary/metastatic).',
        'patient_implications': 'Symptoms vary by tumor location and size, potentially including headaches, seizures, cognitive changes, or focal neurological deficits.',
        'common_treatments': 'Depends on type, location, and grade; may include surgery, radiation therapy, chemotherapy, or targeted therapies.'
    },
    'breast_benign': {
        'description': 'Non-cancerous breast tissue or benign breast conditions.',
        'details': 'Includes conditions like fibrocystic changes, fibroadenomas, intraductal papillomas, and adenosis. These are common and not life-threatening.',
        'patient_implications': 'Benign conditions may cause discomfort or concern but don\'t increase cancer risk significantly.',
        'common_treatments': 'Often no treatment needed beyond monitoring; sometimes surgical removal for symptoms or diagnostic certainty.'
    },
    'breast_malignant': {
        'description': 'Cancerous growth in breast tissue that can invade surrounding tissues and spread to other parts of the body.',
        'details': 'Most commonly originates in the milk ducts (ductal carcinoma) or milk-producing glands (lobular carcinoma). Can be classified by molecular subtypes (hormone receptor status, HER2 status).',
        'patient_implications': 'Treatment success rates are highest with early detection. Regular screening is important.',
        'common_treatments': 'Surgery (lumpectomy or mastectomy), radiation therapy, chemotherapy, hormone therapy, targeted therapy, or immunotherapy depending on cancer type and stage.'
    },
    'cervix_dyk': {
        'description': 'Cervical dyskeratosis showing abnormal keratinization of epithelial cells.',
        'details': 'Dyskeratosis indicates premature or abnormal keratinization of cells and can be associated with HPV infection or other inflammatory conditions.',
        'patient_implications': 'May indicate increased risk for cervical intraepithelial neoplasia or cervical cancer.',
        'common_treatments': 'Monitoring, colposcopy, and possibly biopsy or removal of affected tissue depending on severity.'
    },
    'cervix_koc': {
        'description': 'Cervical koilocytosis showing HPV-related cellular changes.',
        'details': 'Koilocytes are squamous epithelial cells with perinuclear halos and nuclear abnormalities, typically caused by human papillomavirus (HPV) infection.',
        'patient_implications': 'Indicates active HPV infection, which can lead to cervical dysplasia or cancer if persistent.',
        'common_treatments': 'Close monitoring with regular Pap tests, colposcopy, and possible removal of affected tissue.'
    },
    'cervix_mep': {
        'description': 'Cervical metaplasia where one cell type is replaced by another.',
        'details': 'Typically involves replacement of columnar epithelium with squamous epithelium at the transformation zone of the cervix.',
        'patient_implications': 'Usually benign but requires monitoring as it occurs in an area prone to neoplastic changes.',
        'common_treatments': 'Usually observation only; intervention only if abnormal cells are detected.'
    },
    'cervix_pab': {
        'description': 'Parabasal cervical cells, typically found in the deeper layers of cervical epithelium.',
        'details': 'Presence of numerous parabasal cells may indicate atrophy, inflammation, or cellular response to hormonal changes.',
        'patient_implications': 'Often normal finding but may warrant further evaluation in certain contexts.',
        'common_treatments': 'Treatment directed at underlying cause if symptomatic; often no specific treatment needed.'
    },
    'cervix_sfi': {
        'description': 'Cervical superficial cells, normally found on the surface layer of the cervical epithelium.',
        'details': 'Presence of mature squamous epithelial cells is normal in cervical cytology samples.',
        'patient_implications': 'Typically indicates normal cervical cellular maturation pattern.',
        'common_treatments': 'No treatment needed for normal findings; routine screening as recommended.'
    },
    'colon_aca': {
        'description': 'Colorectal adenocarcinoma, a cancer that begins in the cells of the glands lining the colon or rectum.',
        'details': 'Most colorectal cancers begin as polyps, which are abnormal growths inside the colon or rectum that may become cancerous over time.',
        'patient_implications': 'Prognosis depends on stage at diagnosis; early detection through screening significantly improves outcomes.',
        'common_treatments': 'Surgery, chemotherapy, radiation therapy, targeted therapy, or immunotherapy depending on stage and location.'
    },
    'colon_bnt': {
        'description': 'Benign colon tissue without evidence of cancer.',
        'details': 'May include normal tissue or benign conditions like hyperplastic polyps or inflammatory conditions.',
        'patient_implications': 'Regular screening is still important as some benign polyps can become cancerous over time.',
        'common_treatments': 'Often no treatment needed; removal of polyps if present; management of underlying conditions if diagnosed.'
    },
    'kidney_normal': {
        'description': 'Normal kidney tissue showing typical renal architecture.',
        'details': 'Healthy kidney tissue with normal glomeruli, tubules, and supporting structures.',
        'patient_implications': 'No evidence of kidney disease or cancer.',
        'common_treatments': 'No kidney-specific treatment needed; general health maintenance recommended.'
    },
    'kidney_tumor': {
        'description': 'Abnormal growth in kidney tissue that may be benign or malignant.',
        'details': 'The most common type of kidney cancer is renal cell carcinoma (RCC). Other types include transitional cell carcinoma and rare forms such as Wilms tumor.',
        'patient_implications': 'Many kidney tumors are found incidentally during imaging for other conditions. Early-stage tumors have better prognosis.',
        'common_treatments': 'Surgery (partial or complete nephrectomy), ablation therapies, targeted therapy, immunotherapy, or active surveillance for small tumors.'
    },
    'lung_aca': {
        'description': 'Lung adenocarcinoma, a type of non-small cell lung cancer that begins in the cells that line the alveoli.',
        'details': 'Most common type of lung cancer, often developing in the outer regions of the lungs. Can occur in non-smokers more commonly than other types of lung cancer.',
        'patient_implications': 'May be detected earlier than other lung cancers due to peripheral location. Genetic testing may identify targetable mutations.',
        'common_treatments': 'Surgery, radiation therapy, chemotherapy, targeted therapy (for specific mutations), immunotherapy, or combinations based on stage and molecular profile.'
    },
    'lung_bnt': {
        'description': 'Benign lung tissue without evidence of malignancy.',
        'details': 'May include normal lung tissue or benign conditions like hamartoma, inflammatory pseudotumor, or granuloma.',
        'patient_implications': 'Generally good prognosis; follow-up may be recommended to ensure stability.',
        'common_treatments': 'Often observation only; sometimes surgical removal for diagnosis or if causing symptoms.'
    },
    'lung_scc': {
        'description': 'Lung squamous cell carcinoma, a type of non-small cell lung cancer that develops in the flat cells lining the airways.',
        'details': 'Strongly associated with smoking history. Typically develops in the central part of the lungs, near the major bronchi.',
        'patient_implications': 'May cause symptoms earlier than adenocarcinoma due to central location. Tends to grow and spread more slowly than small cell lung cancer.',
        'common_treatments': 'Surgery (if resectable), radiation therapy, chemotherapy, immunotherapy, or combinations depending on stage.'
    },
    'lymph_cll': {
        'description': 'Chronic lymphocytic leukemia/small lymphocytic lymphoma (CLL/SLL), a type of cancer affecting white blood cells.',
        'details': 'Slow-growing cancer of B lymphocytes found in the blood, bone marrow, and lymph nodes. CLL and SLL are essentially the same disease, differing only in where the cancer cells collect.',
        'patient_implications': 'Often asymptomatic and discovered during routine blood tests. Many patients don\'t require immediate treatment ("watch and wait" approach).',
        'common_treatments': 'Observation for asymptomatic patients; chemotherapy, targeted therapy, immunotherapy, or stem cell transplant for progressive disease.'
    },
    'lymph_fl': {
        'description': 'Follicular lymphoma, a type of non-Hodgkin lymphoma that begins in the lymphatic system.',
        'details': 'Slow-growing cancer of B lymphocytes arranged in a circular (follicular) pattern. Second most common type of non-Hodgkin lymphoma.',
        'patient_implications': 'Often responds well to treatment but typically not curable; can transform to more aggressive lymphoma over time.',
        'common_treatments': 'Observation for asymptomatic patients; rituximab-based therapy, radiation, chemotherapy, or stem cell transplant for symptomatic or progressive disease.'
    },
    'lymph_mcl': {
        'description': 'Mantle cell lymphoma, an uncommon type of non-Hodgkin lymphoma.',
        'details': 'Develops from B lymphocytes in the "mantle zone" of lymph nodes. Associated with cyclin D1 protein overexpression due to t(11;14) translocation.',
        'patient_implications': 'Typically diagnosed at advanced stage and can be aggressive, though some cases may progress slowly.',
        'common_treatments': 'Chemotherapy with rituximab, targeted therapies (BTK inhibitors, BCL-2 inhibitors), stem cell transplant for eligible patients.'
    },
    'oral_normal': {
        'description': 'Normal oral tissue showing typical structure without pathological changes.',
        'details': 'Healthy oral mucosa with stratified squamous epithelium and typical underlying supportive tissues.',
        'patient_implications': 'No evidence of oral disease or cancer.',
        'common_treatments': 'No specific treatment needed; routine oral hygiene and dental care recommended.'
    },
    'oral_scc': {
        'description': 'Oral squamous cell carcinoma, a type of cancer that begins in the flat cells lining the oral cavity.',
        'details': 'Most common type of oral cancer. Risk factors include tobacco use, alcohol consumption, and HPV infection.',
        'patient_implications': 'Early detection improves prognosis significantly. Regular oral examinations are important, especially for those with risk factors.',
        'common_treatments': 'Surgery, radiation therapy, chemotherapy, targeted therapy, or combinations depending on stage and location.'
    }
}

# Load the CNN model
print("Loading CNN model...")
try:
    # Try loading with GPU first
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully with GPU")
except (tf.errors.ResourceExhaustedError, tf.errors.InternalError) as e:
    print(f"Failed to load model with GPU: {e}")
    print("Attempting to load model with CPU only...")
    
    # Force CPU usage
    os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  
    model = tf.keras.models.load_model(MODEL_PATH)
    print("Model loaded successfully with CPU")

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path, target_size=(224, 224)):
    """Preprocess image for model prediction"""
    img = Image.open(image_path).convert("RGB")
    img = img.resize(target_size)
    img_array = np.array(img)
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

def clear_session_after_predict():
    """Clear TF session to free memory after prediction"""
    tf.keras.backend.clear_session()

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
            
            # Execute prediction with memory optimization
            with tf.device('/CPU:0'):  # Force CPU prediction for stability
                prediction = model.predict(preprocessed_img, verbose=0)[0]

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

            # Add medical information for the predicted class
            if top_class in cancer_information:
                result["cancer_info"] = cancer_information[top_class]
            else:
                result["cancer_info"] = {
                    "description": "Information not available for this classification.",
                    "details": "Please consult with a healthcare professional for more information.",
                    "patient_implications": "A medical professional should interpret these results.",
                    "common_treatments": "Treatment options should be discussed with your healthcare provider."
                }

            # Add top 3 alternative predictions with their information
            top3_indices = np.argsort(prediction)[-4:-1][::-1]  # Get indices of top 3 after the best one
            top3_classes = [class_labels[i] for i in top3_indices]
            top3_confidences = [float(prediction[i]) for i in top3_indices]

            result["alternatives_info"] = []
            for cls, conf in zip(top3_classes, top3_confidences):
                alt_info = {
                    "class": cls,
                    "confidence": conf,
                    "readable_name": readable_class_names.get(cls, cls),
                    "organ": get_organ_from_class(cls)
                }

                if cls in cancer_information:
                    alt_info["brief_info"] = cancer_information[cls]["description"]
                else:
                    alt_info["brief_info"] = "Information not available for this classification."

                result["alternatives_info"].append(alt_info)

            # Create visualizations
            filename_base = filename.split('.')[0]
            visualizations = create_visualization(result, filename_base)
            result["visualizations"] = visualizations
            
            # Clear session to free memory
            clear_session_after_predict()

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