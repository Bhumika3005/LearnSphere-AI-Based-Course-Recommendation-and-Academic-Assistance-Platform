import pandas as pd
import pickle
import os

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# CREATE MODELS FOLDER

os.makedirs("../models", exist_ok=True)

# LOAD CLEANED DATASET

print("Loading Dataset...")

df = pd.read_csv("../dataset/final_cleaned_courses.csv")

print("Dataset Loaded Successfully")
print(df.shape)

# CHECK REQUIRED COLUMN


if 'combined_text' not in df.columns:
    print("Error: combined_text column not found!")
    exit()

# LOAD SENTENCE TRANSFORMER MODEL

print("\nLoading Sentence Transformer Model...")

model = SentenceTransformer("all-MiniLM-L6-v2")

print("Model Loaded Successfully")

# GENERATE EMBEDDINGS

print("\nGenerating Embeddings...")

embeddings = model.encode(
    df["combined_text"].tolist(),
    show_progress_bar=True
)

print("Embeddings Generated Successfully")

# CALCULATE COSINE SIMILARITY

print("\nCalculating Similarity Matrix...")

similarity = cosine_similarity(embeddings)

print("Similarity Matrix Created")

# SAVE MODEL FILES

print("\nSaving Files...")

pickle.dump(
    embeddings,
    open("../models/embeddings.pkl", "wb")
)

pickle.dump(
    similarity,
    open("../models/similarity.pkl", "wb")
)

pickle.dump(
    df,
    open("../models/courses.pkl", "wb")
)

print("\nModel Training Completed Successfully")

print("\nSaved Files:")
print("1. embeddings.pkl")
print("2. similarity.pkl")
print("3. courses.pkl")

print("\nFiles saved inside models folder.")