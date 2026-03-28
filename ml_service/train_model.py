"""
train_model.py
--------------
Downloads medical imaging datasets from Kaggle and fine-tunes
EfficientNetB0 to classify: xray | mri | ct | other

Kaggle datasets used:
  - chest x-ray:  paultimothymooney/chest-xray-pneumonia
  - brain mri:    navoneel/brain-mri-images-for-brain-tumor-detection
  - ct scans:     kmader/siim-medical-images
  - other (non-medical): puneet6060/intel-image-classification  (nature/objects)

Setup:
  1. pip install -r requirements.txt
  2. Place kaggle.json in ~/.kaggle/  (from https://www.kaggle.com/account)
  3. python train_model.py
"""

import os, shutil, json, numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import matplotlib.pyplot as plt

# ── Config ────────────────────────────────────────────────────────────────────
IMG_SIZE    = 224
BATCH_SIZE  = 32
EPOCHS      = 20
DATA_DIR    = "dataset"
MODEL_PATH  = "model/medical_classifier.h5"
CLASSES     = ["ct", "mri", "other", "xray"]   # sorted alphabetically = keras order
CONFIDENCE_THRESHOLD = 0.70

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs("model", exist_ok=True)

# ── Step 1: Download datasets from Kaggle ─────────────────────────────────────
def download_datasets():
    import kaggle
    kaggle.api.authenticate()
    print("Downloading datasets from Kaggle...")

    # xray and mri — standard jpg/png datasets
    jpg_downloads = [
        ("paultimothymooney/chest-xray-pneumonia",              "xray_raw",  "chest_xray/train/NORMAL", "xray"),
        ("navoneel/brain-mri-images-for-brain-tumor-detection", "mri_raw",   "brain_tumor_dataset/yes", "mri"),
    ]
    for slug, dest, subfolder, label in jpg_downloads:
        dest_path = os.path.join(DATA_DIR, dest)
        if not os.path.exists(dest_path):
            print(f"  Downloading {slug}...")
            kaggle.api.dataset_download_files(slug, path=dest_path, unzip=True)
        else:
            print(f"  {slug} already downloaded, skipping.")
        class_dir = os.path.join(DATA_DIR, "train", label)
        os.makedirs(class_dir, exist_ok=True)
        src = os.path.join(dest_path, subfolder)
        if os.path.exists(src):
            files = [f for f in os.listdir(src) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            for f in files[:1500]:
                shutil.copy(os.path.join(src, f), os.path.join(class_dir, f))
            print(f"  Copied {min(len(files), 1500)} images → {label}/")

    # CT — use pydicom to read .dcm files and convert to png
    ct_dcm_dir = os.path.join(DATA_DIR, "ct_raw", "dicom_dir")
    ct_class_dir = os.path.join(DATA_DIR, "train", "ct")
    os.makedirs(ct_class_dir, exist_ok=True)
    if os.path.exists(ct_dcm_dir):
        import pydicom
        dcm_files = [f for f in os.listdir(ct_dcm_dir) if f.lower().endswith('.dcm')]
        converted = 0
        for f in dcm_files[:1500]:
            src_path = os.path.join(ct_dcm_dir, f)
            dst_path = os.path.join(ct_class_dir, f.replace('.dcm', '.png'))
            if not os.path.exists(dst_path):
                try:
                    ds = pydicom.dcmread(src_path)
                    arr = ds.pixel_array.astype(np.float32)
                    arr = ((arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255).astype(np.uint8)
                    from PIL import Image as PILImage
                    PILImage.fromarray(arr).convert('RGB').save(dst_path)
                    converted += 1
                except Exception as e:
                    print(f"  [WARN] Skipping {f}: {e}")
        print(f"  Converted {converted} CT DICOM images → ct/")
    else:
        print("  [WARN] CT dicom_dir not found, skipping CT.")

    # other — use animals dataset (no permission issues)
    other_dest = os.path.join(DATA_DIR, "other_raw")
    other_class_dir = os.path.join(DATA_DIR, "train", "other")
    os.makedirs(other_class_dir, exist_ok=True)
    if not os.path.exists(other_dest):
        print("  Downloading animals10 dataset for 'other' class...")
        kaggle.api.dataset_download_files("alessiocorrado99/animals10", path=other_dest, unzip=True)
    else:
        print("  other dataset already downloaded, skipping.")
    # Walk and collect any jpg/png images
    other_files = []
    for root, _, files in os.walk(other_dest):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                other_files.append(os.path.join(root, f))
    for fpath in other_files[:1500]:
        shutil.copy(fpath, os.path.join(other_class_dir, os.path.basename(fpath)))
    print(f"  Copied {min(len(other_files), 1500)} images → other/")

    print("Dataset preparation complete.\n")


# ── Step 2: Build EfficientNetB0 model ────────────────────────────────────────
def build_model():
    base = EfficientNetB0(
        weights    = "imagenet",
        include_top= False,
        input_shape= (IMG_SIZE, IMG_SIZE, 3)
    )
    # Freeze base initially
    base.trainable = False

    inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(len(CLASSES), activation="softmax")(x)

    model = Model(inputs, outputs)
    model.compile(
        optimizer = tf.keras.optimizers.Adam(1e-3),
        loss      = "categorical_crossentropy",
        metrics   = ["accuracy"]
    )
    return model, base


# ── Step 3: Data generators ───────────────────────────────────────────────────
def get_generators():
    train_gen = ImageDataGenerator(
        rescale          = 1./255,
        rotation_range   = 15,
        width_shift_range= 0.1,
        height_shift_range=0.1,
        horizontal_flip  = True,
        zoom_range       = 0.1,
        validation_split = 0.2,
    )

    train_data = train_gen.flow_from_directory(
        os.path.join(DATA_DIR, "train"),
        target_size  = (IMG_SIZE, IMG_SIZE),
        batch_size   = BATCH_SIZE,
        class_mode   = "categorical",
        subset       = "training",
        shuffle      = True,
    )
    val_data = train_gen.flow_from_directory(
        os.path.join(DATA_DIR, "train"),
        target_size  = (IMG_SIZE, IMG_SIZE),
        batch_size   = BATCH_SIZE,
        class_mode   = "categorical",
        subset       = "validation",
        shuffle      = False,
    )
    return train_data, val_data


# ── Step 4: Train ─────────────────────────────────────────────────────────────
def train():
    download_datasets()

    model, base = build_model()
    train_data, val_data = get_generators()

    callbacks = [
        ModelCheckpoint(MODEL_PATH, save_best_only=True, monitor="val_accuracy", verbose=1),
        EarlyStopping(patience=5, restore_best_weights=True, monitor="val_accuracy"),
        ReduceLROnPlateau(factor=0.3, patience=3, monitor="val_loss", verbose=1),
    ]

    print("Phase 1: Training top layers (base frozen)...")
    history1 = model.fit(
        train_data, validation_data=val_data,
        epochs=10, callbacks=callbacks
    )

    # Phase 2: Fine-tune top 30 layers of EfficientNet
    print("\nPhase 2: Fine-tuning top 30 layers of EfficientNetB0...")
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer = tf.keras.optimizers.Adam(1e-5),
        loss      = "categorical_crossentropy",
        metrics   = ["accuracy"]
    )
    history2 = model.fit(
        train_data, validation_data=val_data,
        epochs=EPOCHS, callbacks=callbacks
    )

    # Save class indices
    class_indices = train_data.class_indices
    with open("model/class_indices.json", "w") as f:
        json.dump(class_indices, f)
    print(f"\nClass indices saved: {class_indices}")

    # Plot training curves
    plot_history(history1, history2)

    # Evaluate
    loss, acc = model.evaluate(val_data)
    print(f"\nFinal Validation Accuracy: {acc*100:.2f}%")
    print(f"Model saved to: {MODEL_PATH}")


def plot_history(h1, h2):
    acc  = h1.history["accuracy"]  + h2.history["accuracy"]
    val  = h1.history["val_accuracy"] + h2.history["val_accuracy"]
    plt.figure(figsize=(10, 4))
    plt.subplot(1, 2, 1)
    plt.plot(acc, label="Train Acc")
    plt.plot(val, label="Val Acc")
    plt.title("Accuracy"); plt.legend()
    plt.subplot(1, 2, 2)
    loss  = h1.history["loss"] + h2.history["loss"]
    vloss = h1.history["val_loss"] + h2.history["val_loss"]
    plt.plot(loss, label="Train Loss")
    plt.plot(vloss, label="Val Loss")
    plt.title("Loss"); plt.legend()
    plt.tight_layout()
    plt.savefig("model/training_curves.png")
    print("Training curves saved to model/training_curves.png")


if __name__ == "__main__":
    train()
