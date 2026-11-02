import pandas as pd
import re

print("Loading Datasets...")

# Load datasets
coursera = pd.read_csv("../dataset/coursera.csv")
udemy = pd.read_csv("../dataset/udemy.csv")
learning = pd.read_csv("../dataset/personalized_learning.csv")

print("Datasets Loaded Successfully")

# Select Required Columns

coursera = coursera[['course_title', 'course_organization']]
coursera.columns = ['title', 'description']

udemy = udemy[['course_title', 'subject']]
udemy.columns = ['title', 'description']

learning = learning[['recommended_path', 'learning_outcome']]
learning.columns = ['title', 'description']

# Merge Datasets

df = pd.concat(
    [coursera, udemy, learning],
    ignore_index=True
)

print("Combined Shape:", df.shape)

# Remove Null Value

df.dropna(inplace=True)

# Remove Duplicates

df.drop_duplicates(inplace=True)

# Text Cleaning

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9 ]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

df['title'] = df['title'].apply(clean_text)
df['description'] = df['description'].apply(clean_text)

# Remove Empty Records

df = df[df['title'] != ""]
df = df[df['description'] != ""]

# Remove Invalid Learning Paths

df = df[
    ~df['title'].str.match(
        r'^m\d(\s+m\d)*$',
        na=False
    )
]

# Create Combined Text

df['combined_text'] = (
    df['title'] + " " + df['description']
)

# Keep Only Relevant Domains

keywords = [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "data science",
    "python",
    "web development",
    "neural network",
    "computer vision",
    "natural language processing",
    "nlp",
    "ai"
]

pattern = "|".join(keywords)

df = df[
    df['combined_text'].str.contains(
        pattern,
        case=False,
        na=False
    )
]

# Remove Unwanted Domains

unwanted = [
    "finance",
    "trading",
    "forex",
    "bank",
    "accounting",
    "cryptocurrency",
    "blockchain",
    "investment",
    "stock",
    "crowdfunding",
    "credit",
    "economics",
    "business",
    "marketing",
    "sales",
    "management"
]

unwanted_pattern = "|".join(unwanted)

df = df[
    ~df['combined_text'].str.contains(
        unwanted_pattern,
        case=False,
        na=False
    )
]

# Remove Very Short Titles

df = df[df['title'].str.len() > 10]

# Remove Duplicate Title

df.drop_duplicates(
    subset=['title'],
    inplace=True
)

# Reset Index

df.reset_index(drop=True, inplace=True)

# Save Clean Dataset

print("\nFinal Dataset Shape:")
print(df.shape)

print("\nSample Courses:")
print(df[['title']].head(20))

df.to_csv(
    "../dataset/final_cleaned_courses.csv",
    index=False
)

print("\nDataset Saved Successfully")
print("File: final_cleaned_courses.csv")