import pickle
import pandas as pd

# LOAD TRAINED FILES

print("Loading Recommendation Model...")

courses = pickle.load(
    open("../models/courses.pkl", "rb")
)

similarity = pickle.load(
    open("../models/similarity.pkl", "rb")
)

print("Model Loaded Successfully")

# CLEAN DATA

courses = courses.dropna(subset=['title'])

courses['title'] = courses['title'].astype(str)

courses = courses[
    (courses['title'] != 'nan') &
    (courses['title'].str.len() > 5)
]

courses.reset_index(drop=True, inplace=True)

print("Dataset Cleaned")

# RECOMMEND FUNCTION

def recommend(course_name):

    course_name = course_name.lower()

    matches = courses[
        courses['title'].str.contains(
            course_name,
            case=False,
            na=False
        )
    ]

    if matches.empty:
        print("\nCourse Not Found!")
        return

    idx = matches.index[0]

    distances = similarity[idx]

    recommendations = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda x: x[1]
    )

    print("\nTop 5 Recommendations:\n")

    count = 0

    for course in recommendations:

        course_index = course[0]

        title = courses.iloc[course_index]['title']

        if (
            title.lower() != course_name.lower()
            and title != 'nan'
            and len(title) > 5
        ):

            count += 1

            print(f"{count}. {title}")

        if count == 5:
            break

# USER INPUT

while True:

    course = input(
        "\nEnter Course Name (or 'exit'): "
    )

    if course.lower() == "exit":
        print("Program Closed")
        break

    recommend(course)