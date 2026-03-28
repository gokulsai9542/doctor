# ML Service — Medical Image Classifier

EfficientNetB0 fine-tuned to classify: **xray | mri | ct | other**

---

## Setup

### 1. Install Python dependencies
```bash
cd ml_service
pip install -r requirements.txt
```

### 2. Setup Kaggle API
1. Go to https://www.kaggle.com/account → Create New Token
2. Download `kaggle.json`
3. Place it at:
   - Windows: `C:\Users\<you>\.kaggle\kaggle.json`
   - Linux/Mac: `~/.kaggle/kaggle.json`

### 3. Train the model (downloads datasets automatically)
```bash
python train_model.py
```
This will:
- Download 4 Kaggle datasets (~2GB total)
- Train EfficientNetB0 in 2 phases (frozen base → fine-tune)
- Save model to `model/medical_classifier.h5`
- Save class indices to `model/class_indices.json`
- Save training curves to `model/training_curves.png`

Training time: ~15-30 min on GPU, ~1-2 hours on CPU

### 4. Start Flask service
```bash
python app.py
```
Runs on http://localhost:5001

---

## API

### POST /predict
```
curl -X POST http://localhost:5001/predict \
  -F "image=@chest_xray.jpg"
```

Response:
```json
{
  "label": "xray",
  "confidence": 0.9423,
  "is_valid": true,
  "all_scores": {
    "ct": 0.0201,
    "mri": 0.0156,
    "other": 0.0220,
    "xray": 0.9423
  },
  "threshold": 0.7
}
```

### GET /health
```json
{ "status": "ok", "model_loaded": true, "classes": ["ct","mri","other","xray"] }
```

---

## Validation Rules
| Condition | Result |
|---|---|
| label = xray/mri/ct AND confidence ≥ 0.70 | ✅ Accepted |
| label = other | ❌ Rejected — non_medical |
| confidence < 0.70 | ❌ Rejected — low_confidence |
| file > 5MB | ❌ Rejected — too_large |
| non image MIME | ❌ Rejected — invalid_mime |

---

## Kaggle Datasets Used
| Dataset | Class | Link |
|---|---|---|
| Chest X-Ray Images | xray | paultimothymooney/chest-xray-pneumonia |
| Brain MRI Images | mri | navoneel/brain-mri-images-for-brain-tumor-detection |
| SIIM Medical Images | ct | kmader/siim-medical-images |
| Intel Image Classification | other | puneet6060/intel-image-classification |
