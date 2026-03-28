"""
create_mock_model.py
Creates a lightweight EfficientNetB0-based model with random weights.
The model structure matches what app.py expects.
Run this once to generate model/medical_classifier.h5
"""

import os, json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import EfficientNetB0

IMG_SIZE = 224
CLASSES  = ["ct", "mri", "other", "xray"]   # alphabetical = keras default order

os.makedirs("model", exist_ok=True)

print("[INFO] Building EfficientNetB0 model...")
base = EfficientNetB0(weights="imagenet", include_top=False, input_shape=(IMG_SIZE, IMG_SIZE, 3))
base.trainable = False

inputs  = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x       = base(inputs, training=False)
x       = layers.GlobalAveragePooling2D()(x)
x       = layers.BatchNormalization()(x)
x       = layers.Dropout(0.3)(x)
x       = layers.Dense(256, activation="relu")(x)
x       = layers.Dropout(0.2)(x)
outputs = layers.Dense(len(CLASSES), activation="softmax")(x)

model = Model(inputs, outputs)
model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

model.save("model/medical_classifier.h5")
print("[INFO] Saved model/medical_classifier.h5")

class_indices = {c: i for i, c in enumerate(CLASSES)}
with open("model/class_indices.json", "w") as f:
    json.dump(class_indices, f)
print(f"[INFO] Saved model/class_indices.json: {class_indices}")
print("\nDone! Now run: python app.py")
