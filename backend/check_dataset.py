import pandas as pd

# Load Cleaned Dataset
df = pd.read_csv("../dataset/final_cleaned_courses.csv")

# -----------------------------------
# DATASET SHAPE
# -----------------------------------

print("=" * 50)
print("DATASET SHAPE")
print("=" * 50)

print(df.shape)

# -----------------------------------
# COLUMN NAMES
# -----------------------------------

print("\n" + "=" * 50)
print("COLUMN NAMES")
print("=" * 50)

print(df.columns)

# -----------------------------------
# FIRST 20 ROWS
# -----------------------------------

print("\n" + "=" * 50)
print("FIRST 20 ROWS")
print("=" * 50)

print(df.head(20))

# -----------------------------------
# LAST 20 ROWS
# -----------------------------------

print("\n" + "=" * 50)
print("LAST 20 ROWS")
print("=" * 50)

print(df.tail(20))

# -----------------------------------
# MISSING VALUES
# -----------------------------------

print("\n" + "=" * 50)
print("MISSING VALUES")
print("=" * 50)

print(df.isnull().sum())

# -----------------------------------
# DUPLICATE ROWS
# -----------------------------------

print("\n" + "=" * 50)
print("DUPLICATE ROWS")
print("=" * 50)

print(df.duplicated().sum())

# -----------------------------------
# RANDOM 20 COURSES
# -----------------------------------

print("\n" + "=" * 50)
print("RANDOM 20 COURSES")
print("=" * 50)

print(df['title'].sample(20))

# -----------------------------------
# TITLE LENGTH CHECK
# -----------------------------------

print("\n" + "=" * 50)
print("SHORTEST TITLES")
print("=" * 50)

print(df['title'].sort_values().head(20))

# -----------------------------------
# DATASET INFO
# -----------------------------------

print("\n" + "=" * 50)
print("DATASET INFO")
print("=" * 50)

print(df.info())

# -----------------------------------
# UNIQUE DESCRIPTIONS
# -----------------------------------

print("\n" + "=" * 50)
print("DESCRIPTION COUNTS")
print("=" * 50)

print(df['description'].value_counts().head(20))

# -----------------------------------
# CHECK FOR UNWANTED COURSES
# -----------------------------------

print("\n" + "=" * 50)
print("UNWANTED COURSES")
print("=" * 50)

unwanted = df[
    df['combined_text'].str.contains(
        'finance|music|history|psychology|trading',
        case=False,
        na=False
    )
]

print(unwanted[['title']].head(20))

print("\nTotal Unwanted Courses Found:")
print(len(unwanted))