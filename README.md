# 🩺 MedAnnotate — Medical Image Annotation Platform

A full-stack web platform where specialized doctors annotate medical images (X-ray, MRI, CT scan) and get paid. The annotated data is exported in COCO/YOLO format and used to train CNN machine learning models.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Features](#features)
- [User Roles](#user-roles)
- [Folder Structure](#folder-structure)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [ML Pipeline](#ml-pipeline)
- [Payment Flow](#payment-flow)
- [Image Validation](#image-validation)
- [Screenshots](#screenshots)

---

## Overview

MedAnnotate is a production-ready medical image annotation platform built for a hackathon. It connects three types of users:

- **Image Providers** (hospitals/clinics) upload medical images
- **Doctors** (radiologists, neurologists) annotate those images and earn money
- **Admins** review annotations, approve/reject them, and trigger ML training

The annotated data is stored in COCO and YOLO formats and fed into a CNN model (EfficientNetB0) for medical image classification.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js 18, Vite, Tailwind CSS v3, Lucide Icons, React Hot Toast |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Storage | Cloudinary (medical image hosting) |
| Authentication | JWT (JSON Web Tokens) + bcryptjs |
| Image Validation | Jimp (pixel-level grayscale analysis) |
| ML Service | Python Flask + TensorFlow + EfficientNetB0 |
| Payment | Mock payment gateway (Razorpay-like flow) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  Login │ Dashboard │ Tasks │ Annotate │ Admin │ Provider │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────▼────────────────────────────────┐
│                  BACKEND (Node.js + Express)             │
│                                                          │
│  /api/auth        /api/images      /api/annotations      │
│  /api/payments    /api/ml          /api/rejected         │
└──────┬──────────────────┬──────────────────┬────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼────────────┐
│  MongoDB    │  │  Cloudinary   │  │  Flask ML Service  │
│  Atlas      │  │  (Images)     │  │  /predict (CNN)    │
└─────────────┘  └───────────────┘  └────────────────────┘
```

---

## Features

### Authentication
- JWT-based login and registration
- Role-based access control (doctor, provider, admin)
- Password hashing with bcryptjs
- Protected routes per role

### Image Management
- Providers and admins upload medical images
- Images stored on Cloudinary
- Pixel-level validation rejects non-medical images (maps, selfies, etc.)
- MD5 hash-based duplicate detection
- Auto-assign images to matching doctors by specialization

### Annotation Tool
- Canvas-based bounding box drawing tool
- Live preview while drawing
- Label presets (lesion, tumor, nodule, fracture)
- Undo / Clear all support
- Split layout: image viewer (left) + tools panel (right)

### Admin Review System
- Table view of all submitted annotations
- Search by doctor name/email
- Filter by status (submitted, approved, rejected)
- Approve/Reject with optional notes
- Payment auto-created on approval

### Payment System
- Razorpay-like mock payment flow
- 3 payment methods: UPI, Credit/Debit Card, Net Banking
- Fake transaction ID generation (TXN-XXXXXXXXXXXX)
- Payment statuses: pending → processing → paid / failed
- Retry failed payments
- Doctor earnings dashboard with full transaction history

### ML Pipeline
- Export approved annotations in COCO format
- Export approved annotations in YOLO format
- Trigger CNN training job from Admin Panel
- Real-time epoch-by-epoch training progress
- EfficientNetB0 model trained on Kaggle medical datasets

### Image Validation (No Flask Required)
- Pixel-level grayscale analysis using Jimp
- Rejects colorful images (maps, photos, screenshots)
- Checks: color ratio, average saturation, brightness contrast
- All rejected uploads logged to database

---

## User Roles

### 🩺 Doctor
- Register with specialization (Radiologist, Neurologist, etc.)
- View available annotation tasks
- Annotate images with bounding boxes
- Track annotation status (submitted → approved/rejected)
- View earnings and payment history

### 🏥 Image Provider
- Register with organization/hospital name
- Upload medical images (X-ray, MRI, CT)
- View uploaded images and their annotation status
- Pay doctors via mock payment gateway
- Track total spending

### 🛡️ Admin
- Upload medical images
- Review all submitted annotations
- Approve or reject with notes
- Trigger ML model training
- Monitor rejected uploads
- View all payments

---

## Folder Structure

```
h1/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   └── uploadController.js    # Image upload + AI validation logic
│   ├── middleware/
│   │   └── auth.js                # JWT auth + role guards
│   ├── models/
│   │   ├── User.js                # Doctor, Admin, Provider schema
│   │   ├── Image.js               # Medical image schema
│   │   ├── Annotation.js          # Annotation labels schema
│   │   ├── Payment.js             # Payment transaction schema
│   │   ├── MLJob.js               # ML training job schema
│   │   └── RejectedUpload.js      # Rejected upload log schema
│   ├── routes/
│   │   ├── auth.js                # Login, register, profile
│   │   ├── images.js              # Upload, fetch, assign tasks
│   │   ├── annotations.js         # Submit, review, export
│   │   ├── payments.js            # Create order, verify, retry
│   │   ├── ml.js                  # Train, export, job status
│   │   └── rejected.js            # Rejected uploads monitoring
│   ├── utils/
│   │   ├── imageValidator.js      # Pixel-level medical image check
│   │   ├── exportFormat.js        # COCO and YOLO export
│   │   ├── mockPayment.js         # Fake payment processor
│   │   └── mlSimulator.js         # CNN training simulator
│   ├── seed.js                    # Create admin user script
│   ├── server.js                  # Express app entry point
│   └── .env                       # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js           # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Sidebar + Topbar wrapper
│   │   │   ├── Sidebar.jsx        # Role-based navigation sidebar
│   │   │   ├── Topbar.jsx         # Top header with user info
│   │   │   ├── AnnotationCanvas.jsx # Canvas drawing tool
│   │   │   ├── PaymentModal.jsx   # Razorpay-like payment modal
│   │   │   ├── PrivateRoute.jsx   # Route guard by role
│   │   │   └── ToastProvider.jsx  # Toast notification config
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Global auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Sign in page
│   │   │   ├── Register.jsx       # Create account page
│   │   │   ├── Dashboard.jsx      # Stats, recent activity
│   │   │   ├── TaskList.jsx       # Available annotation tasks
│   │   │   ├── AnnotateTask.jsx   # Split-layout annotation tool
│   │   │   ├── Earnings.jsx       # Doctor payment history
│   │   │   ├── AdminPanel.jsx     # Review + upload panel
│   │   │   └── ProviderPanel.jsx  # Upload + pay doctors panel
│   │   ├── index.css              # Tailwind + custom components
│   │   └── App.jsx                # Routes definition
│   └── .env                       # Frontend environment variables
│
└── ml_service/
    ├── app.py                     # Flask prediction API
    ├── train_model.py             # EfficientNetB0 training script
    ├── requirements.txt           # Python dependencies
    └── model/
        ├── medical_classifier.h5  # Trained model weights
        └── class_indices.json     # Class label mapping
```

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Create new account |
| POST | `/login` | Public | Login and get JWT token |
| GET | `/me` | Auth | Get current user profile |
| PATCH | `/bank-details` | Doctor | Update bank details |

### Images — `/api/images`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/upload` | Provider/Admin | Upload medical image |
| GET | `/tasks` | Doctor | Get available pending tasks |
| GET | `/mine` | Provider | Get own uploaded images |
| PATCH | `/assign/:id` | Doctor | Assign task to self |
| GET | `/:id` | Auth | Get single image by ID |
| GET | `/` | Admin | Get all images |

### Annotations — `/api/annotations`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Doctor | Submit annotation |
| GET | `/mine` | Doctor | Get own annotations |
| GET | `/` | Admin | Get all annotations |
| PATCH | `/review/:id` | Admin | Approve or reject |
| GET | `/export/coco` | Admin | Export in COCO format |
| GET | `/export/yolo` | Admin | Export in YOLO format |

### Payments — `/api/payments`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/mine` | Doctor | Get own earnings |
| GET | `/provider` | Provider | Get payments triggered |
| GET | `/` | Admin | Get all payments |
| POST | `/create-order/:id` | Provider | Create payment order |
| POST | `/verify/:id` | Provider | Process payment |
| POST | `/retry/:id` | Provider | Retry failed payment |

### ML — `/api/ml`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/stats` | Admin | Get training readiness stats |
| POST | `/train` | Admin | Trigger CNN training job |
| GET | `/jobs` | Admin | Get all training jobs |
| GET | `/jobs/:id` | Admin | Poll job status |
| GET | `/export/:format` | Admin | Export dataset (coco/yolo) |

---

## Database Schema

### User
```js
{ name, email, password, role: ['doctor','admin','provider'],
  specialization, organization, earnings, bankAccountNumber, ifscCode, phone }
```

### Image
```js
{ url, publicId, modality: ['xray','mri','ct'], uploadedBy, providerNote,
  status: ['pending','assigned','completed'], assignedTo, autoAssigned,
  aiLabel, aiConfidence, aiAllScores, imageHash }
```

### Annotation
```js
{ image, doctor, labels: [{ category, type: ['bbox','polygon'], coordinates }],
  status: ['submitted','approved','rejected'], adminNote, payoutAmount }
```

### Payment
```js
{ doctor, provider, annotation, amount, currency, status: ['pending','processing','paid','failed'],
  transactionId, paidAt, note }
```

### MLJob
```js
{ triggeredBy, status: ['queued','preparing','training','completed','failed'],
  format, totalImages, totalLabels, epochs, currentEpoch,
  accuracy, loss, epochLogs, modelPath }
```

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- Python 3.9+ (for ML service)
- MongoDB Atlas account
- Cloudinary account

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure environment variables

**backend/.env**
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/medannotate
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FLASK_ML_URL=http://localhost:5001
AI_VALIDATION_ENABLED=false
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Create admin user

```bash
cd backend
node seed.js
```

This creates:
- Email: `admin@medannotate.com`
- Password: `admin123`

### 4. Run the application

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### 5. Run ML service (optional)

```bash
cd ml_service
pip install -r requirements.txt

# One-time training (requires Kaggle API key)
python train_model.py

# Start Flask server (port 5001)
python app.py
```

To enable AI validation after training:
```env
AI_VALIDATION_ENABLED=true
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Backend server port | Yes |
| `MONGO_URI` | MongoDB Atlas connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `FLASK_ML_URL` | Flask ML service URL | No (default: localhost:5001) |
| `AI_VALIDATION_ENABLED` | Enable Flask AI validation | No (default: false) |

---

## ML Pipeline

```
Admin approves annotations
        ↓
POST /api/ml/train  { format: 'coco', epochs: 10 }
        ↓
Annotations exported to COCO/YOLO format
        ↓
MLJob created in MongoDB (status: preparing)
        ↓
CNN training simulation starts (background)
        ↓
Epoch logs saved every iteration
        ↓
GET /api/ml/jobs/:id  (poll for progress)
        ↓
status: completed | accuracy: 94.2% | modelPath saved
```

### Kaggle Datasets Used for Training
| Dataset | Class | Kaggle Slug |
|---|---|---|
| Chest X-Ray Images | xray | paultimothymooney/chest-xray-pneumonia |
| Brain MRI Images | mri | navoneel/brain-mri-images-for-brain-tumor-detection |
| SIIM Medical Images | ct | kmader/siim-medical-images |
| Intel Image Classification | other | puneet6060/intel-image-classification |

---

## Payment Flow

```
Admin approves annotation
        ↓
Payment record created (status: pending, amount: ₹5)
        ↓
Provider sees "Pay Now" button
        ↓
POST /api/payments/create-order/:id
→ Returns: { orderId, amount, currency, doctor }
        ↓
Provider selects method: UPI / Card / Net Banking
        ↓
POST /api/payments/verify/:id  { orderId, method }
        ↓
Mock processor runs (1.5s delay, 90% success rate)
        ↓
✅ Success: TXN-XXXXXXXXXXXX generated, doctor earnings updated
❌ Failed: status = 'failed', retry available
```

---

## Image Validation

When `AI_VALIDATION_ENABLED=false`, pixel-level validation runs using **Jimp**:

| Check | Medical Threshold | Rejection Threshold |
|---|---|---|
| Color ratio (colored pixels) | < 15% | > 25% |
| Average saturation | < 12% | > 20% |
| Brightness contrast (stdDev) | > 25 | < 25 |

**Examples:**
- ✅ X-ray JPEG → colorRatio: 2%, saturation: 3%, stdDev: 68 → **Accepted**
- ❌ Map PNG → colorRatio: 85%, saturation: 72%, stdDev: 45 → **Rejected**
- ❌ Selfie JPEG → colorRatio: 61%, saturation: 48%, stdDev: 52 → **Rejected**

When `AI_VALIDATION_ENABLED=true`, Flask EfficientNetB0 model runs with 70% confidence threshold.

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@medannotate.com | admin123 |

> Run `node seed.js` in the backend folder to create the admin account.

---

## License

MIT License — built for hackathon purposes.
