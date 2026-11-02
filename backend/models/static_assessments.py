"""
models/static_assessments.py
─────────────────────────────────────────────────────────────────────────
Static (hand-written) per-step assessment question banks.

Why this exists: assessments were previously generated live by an LLM
(Groq) every time, which produced near-duplicate/repetitive questions
across different videos of the same course. This file replaces that with
a fixed, curated set of 5 questions per step, for 5 steps per course.

IMPORTANT — step alignment: each step here corresponds by POSITION to
the matching course's "beginner" video list in models/static_data.py
(COURSE_VIDEOS[topic]["beginner"][i]). An earlier version of this file
assumed a generic curriculum order (e.g. HTML→JS→React→Node→DB) that did
not match the real video titles/content at each position, so a step's
assessment often quizzed on the wrong topic entirely relative to the
video actually shown for that step. Keep this file's step order in sync
with static_data.py's beginner list order if either changes.

`answer` is the 0-indexed position of the correct option in `options`.
"""

STATIC_ASSESSMENTS = {

    # ── PYTHON ───────────────────────────────────────────────────────────
    # Matches COURSE_VIDEOS["python"]["beginner"]:
    # 0 Full Course overview / 1 Mosh tutorial / 2 Data Structures /
    # 3 OOP / 4 NumPy & Pandas
    "python": [
        {
            "step_title": "Python Full Course Overview",
            "questions": [
                {"q": "Which keyword is used to define a function in Python?",
                 "options": ["func", "def", "function", "lambda"], "answer": 1},
                {"q": "What is the output of `print(type(5))`?",
                 "options": ["<class 'str'>", "<class 'int'>", "<class 'float'>", "<class 'bool'>"], "answer": 1},
                {"q": "Which symbol is used for a single-line comment in Python?",
                 "options": ["//", "#", "--", "/*"], "answer": 1},
                {"q": "What does `range(5)` generate?",
                 "options": ["Numbers 1 to 5", "Numbers 0 to 4", "Numbers 0 to 5", "Numbers 1 to 4"], "answer": 1},
                {"q": "Which of these correctly starts a for loop over a list `items`?",
                 "options": ["for x in items:", "for (x in items):", "foreach x in items:", "loop x in items:"], "answer": 0},
            ],
        },
        {
            "step_title": "Python Core Concepts (Variables, Conditionals & Functions)",
            "questions": [
                {"q": "Which operator checks equality (not assignment) in Python?",
                 "options": ["=", "==", ":=", "==="], "answer": 1},
                {"q": "What does an `if`/`elif`/`else` chain do?",
                 "options": ["Repeats code", "Defines a function", "Chooses between different code paths", "Imports a module"], "answer": 2},
                {"q": "What does a function return if there is no explicit `return` statement?",
                 "options": ["0", "An error", "None", "An empty string"], "answer": 2},
                {"q": "Which of these is a valid Python variable name?",
                 "options": ["2ndValue", "my-value", "my_value", "my value"], "answer": 2},
                {"q": "What does the `input()` function do?",
                 "options": ["Prints to the screen", "Reads text typed by the user", "Opens a file", "Ends the program"], "answer": 1},
            ],
        },
        {
            "step_title": "Python Data Structures",
            "questions": [
                {"q": "Which data structure uses key-value pairs?",
                 "options": ["list", "tuple", "dict", "set"], "answer": 2},
                {"q": "What is the main difference between a list and a tuple?",
                 "options": ["Lists are immutable, tuples are mutable", "Lists are mutable, tuples are immutable",
                             "Both are identical", "Tuples can't store numbers"], "answer": 1},
                {"q": "Which method adds an item to the end of a list?",
                 "options": ["insert()", "append()", "add()", "extend()"], "answer": 1},
                {"q": "How do you remove duplicate values from a list quickly?",
                 "options": ["Convert it to a tuple", "Convert it to a set", "Use sort()", "Use append()"], "answer": 1},
                {"q": "What does `len(my_dict)` return?",
                 "options": ["The first key", "The number of key-value pairs", "The last value", "An error"], "answer": 1},
            ],
        },
        {
            "step_title": "Python Object-Oriented Programming",
            "questions": [
                {"q": "Which keyword is used to create a class in Python?",
                 "options": ["object", "class", "struct", "def"], "answer": 1},
                {"q": "What is `self` used for inside a class method?",
                 "options": ["It refers to the class itself", "It refers to the current instance of the class",
                             "It's optional and unused", "It refers to the parent class"], "answer": 1},
                {"q": "Which method is automatically called when an object is created?",
                 "options": ["__init__", "__new__", "__create__", "__start__"], "answer": 0},
                {"q": "What is inheritance in OOP?",
                 "options": ["Hiding data inside a class", "A class acquiring properties of another class",
                             "Creating multiple objects", "Deleting an object"], "answer": 1},
                {"q": "Which term describes having multiple methods with the same name but different behavior?",
                 "options": ["Encapsulation", "Abstraction", "Polymorphism", "Inheritance"], "answer": 2},
            ],
        },
        {
            "step_title": "Python for Data Science — NumPy & Pandas",
            "questions": [
                {"q": "What is the main data structure provided by NumPy?",
                 "options": ["DataFrame", "Array (ndarray)", "Series", "List"], "answer": 1},
                {"q": "What is a Pandas DataFrame?",
                 "options": ["A single number", "A 2D labeled table-like data structure", "A type of loop", "A plotting library"], "answer": 1},
                {"q": "Which Pandas function reads a CSV file into a DataFrame?",
                 "options": ["pd.load_csv()", "pd.read_csv()", "pd.open_csv()", "pd.csv_read()"], "answer": 1},
                {"q": "Why are NumPy arrays generally faster than plain Python lists for numeric work?",
                 "options": ["They are stored contiguously and use vectorized operations", "They are written in Python only",
                             "They cannot be sorted", "They are always smaller in file size"], "answer": 0},
                {"q": "Which method shows summary statistics (mean, std, min, max, etc.) of a DataFrame?",
                 "options": ["df.info()", "df.describe()", "df.head()", "df.columns()"], "answer": 1},
            ],
        },
    ],

    # ── WEB DEVELOPMENT ──────────────────────────────────────────────────
    # Matches COURSE_VIDEOS["web development"]["beginner"]:
    # 0 Full Stack overview / 1 HTML & CSS / 2 JavaScript /
    # 3 Responsive Design (Flexbox & Grid) / 4 DOM Manipulation
    "web development": [
        {
            "step_title": "Full Stack Web Development Overview",
            "questions": [
                {"q": "What are the three core building blocks of a website?",
                 "options": ["HTML, CSS, JavaScript", "Python, Java, C++", "SQL, PHP, Ruby", "Word, Excel, PowerPoint"], "answer": 0},
                {"q": "What does 'frontend' refer to in web development?",
                 "options": ["The server logic", "The database", "What the user sees and interacts with in the browser", "The hosting provider"], "answer": 2},
                {"q": "What does 'backend' typically handle?",
                 "options": ["Page styling only", "Server-side logic, databases, and APIs", "Only images", "Font selection"], "answer": 1},
                {"q": "What is a browser's role in web development?",
                 "options": ["It compiles Java code", "It renders HTML/CSS/JS into a visible webpage", "It stores the database", "It hosts the domain name"], "answer": 1},
                {"q": "What does 'full stack' mean for a developer?",
                 "options": ["They only know design", "They work on both frontend and backend", "They only manage servers", "They only write documentation"], "answer": 1},
            ],
        },
        {
            "step_title": "HTML & CSS Fundamentals",
            "questions": [
                {"q": "Which HTML tag is used to create a hyperlink?",
                 "options": ["<link>", "<a>", "<href>", "<nav>"], "answer": 1},
                {"q": "Which CSS property changes the text color of an element?",
                 "options": ["background-color", "font-style", "color", "text-align"], "answer": 2},
                {"q": "What does CSS stand for?",
                 "options": ["Colorful Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Creative Style Syntax"], "answer": 1},
                {"q": "Which HTML tag is used for the largest heading?",
                 "options": ["<h6>", "<head>", "<h1>", "<heading>"], "answer": 2},
                {"q": "How do you link an external CSS file to an HTML page?",
                 "options": ["<style src='file.css'>", "<link rel='stylesheet' href='file.css'>", "<css>file.css</css>", "<import>file.css</import>"], "answer": 1},
            ],
        },
        {
            "step_title": "JavaScript Fundamentals",
            "questions": [
                {"q": "Which keyword declares a variable that can be reassigned in modern JS?",
                 "options": ["const", "let", "var only", "static"], "answer": 1},
                {"q": "What does the DOM represent?",
                 "options": ["A database structure", "The structure of a webpage as objects", "A JavaScript framework", "A CSS preprocessor"], "answer": 1},
                {"q": "Which method adds an event listener to an element?",
                 "options": ["addEventListener()", "onEvent()", "listenTo()", "bindEvent()"], "answer": 0},
                {"q": "What does `===` check for in JavaScript, unlike `==`?",
                 "options": ["Only value", "Value and type", "Only type", "Nothing different"], "answer": 1},
                {"q": "Which of these correctly declares a JavaScript function?",
                 "options": ["function myFunc() {}", "def myFunc():", "func myFunc() {}", "function: myFunc {}"], "answer": 0},
            ],
        },
        {
            "step_title": "Responsive Web Design — Flexbox & Grid",
            "questions": [
                {"q": "Which CSS property turns a container into a flex container?",
                 "options": ["display: flex;", "position: flex;", "flex: container;", "layout: flex;"], "answer": 0},
                {"q": "In Flexbox, which property controls the direction items are laid out?",
                 "options": ["flex-direction", "align-items", "justify-self", "grid-template"], "answer": 0},
                {"q": "What is CSS Grid best suited for compared to Flexbox?",
                 "options": ["Only single-row layouts", "Two-dimensional layouts (rows AND columns)", "Only text styling", "Animations only"], "answer": 1},
                {"q": "Which media query targets screens narrower than 600px?",
                 "options": ["@media (max-width: 600px) {}", "@media (min-width: 600px) {}", "@screen (width < 600px) {}", "@responsive(600px) {}"], "answer": 0},
                {"q": "What does 'responsive design' mean?",
                 "options": ["A site that only works on desktop", "A layout that adapts to different screen sizes", "A site with fast server response times only", "A site with no images"], "answer": 1},
            ],
        },
        {
            "step_title": "DOM Manipulation with JavaScript",
            "questions": [
                {"q": "Which method selects a single element by its ID?",
                 "options": ["document.getElementById()", "document.query()", "document.selectId()", "document.findById()"], "answer": 0},
                {"q": "Which property changes the text content of an element via JavaScript?",
                 "options": ["element.text", "element.textContent", "element.value", "element.innerText()"], "answer": 1},
                {"q": "Which method creates a new HTML element in JavaScript?",
                 "options": ["document.createElement()", "document.newElement()", "document.makeElement()", "document.addElement()"], "answer": 0},
                {"q": "What does `element.classList.add('active')` do?",
                 "options": ["Removes the 'active' class", "Adds the 'active' class to the element", "Deletes the element", "Renames the element"], "answer": 1},
                {"q": "What event fires when a user clicks a button?",
                 "options": ["'hover'", "'click'", "'submit'", "'load'"], "answer": 1},
            ],
        },
    ],

    # ── MACHINE LEARNING ─────────────────────────────────────────────────
    # Matches COURSE_VIDEOS["machine learning"]["beginner"]:
    # 0 ML Full Course overview / 1 ML Crash Course (Google) /
    # 2 Intro to ML (Stanford) / 3 Supervised vs Unsupervised / 4 Linear Regression & Gradient Descent
    "machine learning": [
        {
            "step_title": "Machine Learning Full Course Overview",
            "questions": [
                {"q": "What is Machine Learning?",
                 "options": ["Manually coding every rule", "Systems that learn patterns from data", "A type of database", "A web design technique"], "answer": 1},
                {"q": "Which of these is a type of supervised learning task?",
                 "options": ["Clustering", "Classification", "Dimensionality reduction", "Association rule mining"], "answer": 1},
                {"q": "What is 'labeled data' used for?",
                 "options": ["Unsupervised learning only", "Supervised learning", "Data storage", "Data visualization only"], "answer": 1},
                {"q": "What is 'overfitting' in machine learning?",
                 "options": ["The model performs well on new data", "The model learns noise instead of the pattern",
                             "The model trains too quickly", "The model has too little data"], "answer": 1},
                {"q": "What is a 'feature' in a machine learning dataset?",
                 "options": ["The final answer", "An input variable used to make predictions", "A bug in the code", "A type of chart"], "answer": 1},
            ],
        },
        {
            "step_title": "Machine Learning Crash Course — Core Workflow",
            "questions": [
                {"q": "What is 'training data' used for?",
                 "options": ["Only testing the final model", "Teaching a model to recognize patterns", "Styling an application", "Storing user passwords"], "answer": 1},
                {"q": "What does a loss function measure?",
                 "options": ["How fast the code runs", "How wrong the model's predictions are", "The size of the dataset", "The number of features"], "answer": 1},
                {"q": "Why is a train-test split used?",
                 "options": ["To make training faster only", "To evaluate how well the model generalizes to unseen data", "To reduce file size", "It has no real purpose"], "answer": 1},
                {"q": "What is a 'label' in a supervised dataset?",
                 "options": ["The input feature", "The correct answer/output the model should predict", "A comment in the code", "A type of visualization"], "answer": 1},
                {"q": "What does 'model training' actually do?",
                 "options": ["Deletes incorrect data", "Adjusts internal parameters to reduce prediction error", "Only visualizes the data", "Compiles the program"], "answer": 1},
            ],
        },
        {
            "step_title": "Introduction to Machine Learning — Foundations",
            "questions": [
                {"q": "Which of these best describes 'unsupervised learning'?",
                 "options": ["Learning from labeled examples", "Finding patterns in data without labels", "Learning through rewards and penalties", "Memorizing training data exactly"], "answer": 1},
                {"q": "What is a common real-world application of classification?",
                 "options": ["Spam email detection", "Sorting a list alphabetically", "Compressing a file", "Rendering 3D graphics"], "answer": 0},
                {"q": "What does 'generalization' mean for a trained model?",
                 "options": ["Memorizing the training set perfectly", "Performing well on new, unseen data", "Using more features", "Running faster"], "answer": 1},
                {"q": "Which of these is an example of a regression problem?",
                 "options": ["Predicting house prices", "Classifying an email as spam or not", "Grouping customers into segments", "Detecting faces in an image"], "answer": 0},
                {"q": "What is a dataset typically split into for a machine learning project?",
                 "options": ["Only a training set", "Training and test sets (often also validation)", "Only images", "Only text files"], "answer": 1},
            ],
        },
        {
            "step_title": "Supervised vs Unsupervised Learning",
            "questions": [
                {"q": "What is the key difference between supervised and unsupervised learning?",
                 "options": ["Supervised uses labeled data, unsupervised does not", "They are identical", "Unsupervised is always more accurate", "Supervised never uses data"], "answer": 0},
                {"q": "Which of these is an unsupervised learning technique?",
                 "options": ["Linear regression", "K-Means clustering", "Logistic regression", "Decision tree classification"], "answer": 1},
                {"q": "What is 'clustering' used for?",
                 "options": ["Predicting a continuous number", "Grouping similar data points together", "Labeling data manually", "Cleaning missing values"], "answer": 1},
                {"q": "In supervised learning, what does the model learn to map?",
                 "options": ["Inputs to known outputs", "Random noise", "Nothing, it's unsupervised", "Only images to images"], "answer": 0},
                {"q": "Which scenario best fits unsupervised learning?",
                 "options": ["You have labeled spam/not-spam emails", "You want to group customers with no predefined categories", "You want to predict exact house prices", "You want to classify handwritten digits with labels"], "answer": 1},
            ],
        },
        {
            "step_title": "Linear Regression & Gradient Descent",
            "questions": [
                {"q": "What does linear regression predict?",
                 "options": ["A category/class", "A continuous numeric value", "A cluster label", "An image"], "answer": 1},
                {"q": "What is the goal of gradient descent?",
                 "options": ["To increase the loss function", "To minimize the loss function by adjusting parameters", "To sort the dataset", "To visualize data only"], "answer": 1},
                {"q": "What does the 'slope' represent in a simple linear regression line (y = mx + b)?",
                 "options": ["The starting point", "The rate of change of y with respect to x", "The number of data points", "The error term only"], "answer": 1},
                {"q": "What is the 'learning rate' in gradient descent?",
                 "options": ["The size of the dataset", "How big a step is taken when updating parameters", "The number of features", "The final accuracy"], "answer": 1},
                {"q": "What can happen if the learning rate is set too high?",
                 "options": ["Training becomes perfectly stable", "The model may overshoot and fail to converge", "The model trains instantly with no issues", "Nothing changes"], "answer": 1},
            ],
        },
    ],

    # ── JAVA ─────────────────────────────────────────────────────────────
    # Matches COURSE_VIDEOS["java"]["beginner"]:
    # 0 Full Course overview / 1 Mosh tutorial / 2 Data Types & Variables /
    # 3 Control Flow (loops/conditionals) / 4 Methods & Classes
    "java": [
        {
            "step_title": "Java Full Course Overview",
            "questions": [
                {"q": "Which method is the entry point of a Java application?",
                 "options": ["start()", "main()", "run()", "init()"], "answer": 1},
                {"q": "What is the correct file extension for a Java source file?",
                 "options": [".jav", ".java", ".jv", ".jar"], "answer": 1},
                {"q": "Which of these best describes Java?",
                 "options": ["A styling language like CSS", "A general-purpose, object-oriented programming language", "A database query language", "A markup language like HTML"], "answer": 1},
                {"q": "Which tool compiles Java source code into bytecode?",
                 "options": ["javac", "javascript", "pyc", "gcc"], "answer": 0},
                {"q": "What does 'JVM' stand for?",
                 "options": ["Java Virtual Machine", "Java Variable Method", "Joint Virtual Module", "Java Verified Model"], "answer": 0},
            ],
        },
        {
            "step_title": "Java Tutorial — Core Concepts",
            "questions": [
                {"q": "Which keyword declares a constant in Java?",
                 "options": ["const", "final", "static", "let"], "answer": 1},
                {"q": "Which operator is used to compare two values for equality in Java?",
                 "options": ["=", "==", "equals", "==="], "answer": 1},
                {"q": "What is a Java package used for?",
                 "options": ["Styling output", "Organizing related classes together", "Compiling code faster", "Running the JVM"], "answer": 1},
                {"q": "Which of these is a valid Java statement to print text?",
                 "options": ["print('hello')", "System.out.println(\"hello\");", "console.log(\"hello\")", "echo \"hello\""], "answer": 1},
                {"q": "What does `import` do in a Java file?",
                 "options": ["Deletes a class", "Brings in classes/packages so they can be used", "Compiles the program", "Starts the JVM"], "answer": 1},
            ],
        },
        {
            "step_title": "Java Data Types and Variables",
            "questions": [
                {"q": "Which of these is a primitive data type in Java?",
                 "options": ["String", "int", "ArrayList", "Object"], "answer": 1},
                {"q": "Which data type would you use to store a true/false value?",
                 "options": ["int", "boolean", "char", "double"], "answer": 1},
                {"q": "What is the difference between `int` and `double` in Java?",
                 "options": ["No difference", "int stores whole numbers, double stores decimal numbers", "double is for text", "int is for text"], "answer": 1},
                {"q": "How do you declare a variable in Java?",
                 "options": ["You must specify a type (e.g. int, String)", "var only", "let", "dim"], "answer": 0},
                {"q": "What does type casting allow you to do?",
                 "options": ["Delete a variable", "Convert a value from one data type to another", "Create a new class", "Import a library"], "answer": 1},
            ],
        },
        {
            "step_title": "Java Control Flow — Loops and Conditionals",
            "questions": [
                {"q": "Which loop is guaranteed to execute at least once?",
                 "options": ["for loop", "while loop", "do-while loop", "for-each loop"], "answer": 2},
                {"q": "Which keyword starts a conditional statement in Java?",
                 "options": ["if", "when", "check", "cond"], "answer": 0},
                {"q": "What does the `break` statement do inside a loop?",
                 "options": ["Skips to the next iteration", "Exits the loop immediately", "Restarts the loop", "Pauses the program"], "answer": 1},
                {"q": "What does the `continue` statement do inside a loop?",
                 "options": ["Exits the loop", "Skips the rest of the current iteration and moves to the next", "Deletes the loop", "Restarts the program"], "answer": 1},
                {"q": "Which structure lets you choose between many fixed values cleanly?",
                 "options": ["switch statement", "for loop only", "try/catch", "import statement"], "answer": 0},
            ],
        },
        {
            "step_title": "Java Methods and Classes",
            "questions": [
                {"q": "Which keyword is used to create an object in Java?",
                 "options": ["new", "create", "object", "make"], "answer": 0},
                {"q": "What is a method in Java?",
                 "options": ["A variable type", "A block of code that performs a specific task", "A file extension", "A loop type"], "answer": 1},
                {"q": "What does a class represent in Java?",
                 "options": ["A single value", "A blueprint for creating objects", "A loop construct", "A comment"], "answer": 1},
                {"q": "What is method overloading?",
                 "options": ["Same method name with different parameters", "Overriding a parent method", "Deleting a method", "Making a method private"], "answer": 0},
                {"q": "Which access modifier makes a member visible only within its own class?",
                 "options": ["public", "protected", "private", "default"], "answer": 2},
            ],
        },
    ],

    # ── ARTIFICIAL INTELLIGENCE ──────────────────────────────────────────
    # Matches COURSE_VIDEOS["artificial intelligence"]["beginner"]:
    # 0 AI Full Course overview / 1 AI For Everyone (Andrew Ng) /
    # 2 Introduction to AI / 3 AI Search Algorithms / 4 Problem Solving with AI
    "artificial intelligence": [
        {
            "step_title": "Artificial Intelligence Full Course Overview",
            "questions": [
                {"q": "What is Artificial Intelligence broadly defined as?",
                 "options": ["A physical robot", "Systems that mimic human-like intelligent behavior", "A type of database", "A web browser feature"], "answer": 1},
                {"q": "Which of these is a subfield of AI?",
                 "options": ["Machine Learning", "HTML", "CSS", "SQL"], "answer": 0},
                {"q": "What does 'NLP' stand for in AI?",
                 "options": ["Natural Language Processing", "Neural Learning Protocol", "Network Layer Programming", "New Language Parser"], "answer": 0},
                {"q": "Which of these is an example of narrow (weak) AI?",
                 "options": ["A general human-level thinking machine", "A voice assistant like Siri or Alexa", "A fully conscious robot", "None of these are AI"], "answer": 1},
                {"q": "What is computer vision, as a field of AI?",
                 "options": ["Teaching computers to understand images/video", "A type of monitor", "A programming language", "A database system"], "answer": 0},
            ],
        },
        {
            "step_title": "AI For Everyone — Practical Understanding",
            "questions": [
                {"q": "According to a practical, business-focused view of AI, what is AI mainly good at today?",
                 "options": ["General human-level reasoning about anything", "Learning specific, well-defined tasks from data", "Fully replacing all human jobs", "Having genuine consciousness"], "answer": 1},
                {"q": "What is a common first step when a company considers adopting AI?",
                 "options": ["Buying more office chairs", "Identifying a specific, well-defined problem AI could help solve", "Immediately firing all staff", "Ignoring their data entirely"], "answer": 1},
                {"q": "Why is data quality important for AI projects in practice?",
                 "options": ["It isn't important at all", "AI systems learn from data, so poor data leads to poor results", "Only the amount of data matters, never quality", "Data quality only affects storage cost"], "answer": 1},
                {"q": "What is a realistic limitation of most AI systems today?",
                 "options": ["They can perform any task a human can, perfectly", "They generally work well only within the specific task they were trained for", "They require no data at all", "They never make mistakes"], "answer": 1},
                {"q": "What does it mean for an AI project to be 'feasible'?",
                 "options": ["It sounds impressive in a meeting", "It's technically achievable with available data and technology", "It requires no planning", "It guarantees profit"], "answer": 1},
            ],
        },
        {
            "step_title": "Introduction to Artificial Intelligence",
            "questions": [
                {"q": "What is 'knowledge representation' in AI?",
                 "options": ["Storing images only", "Structuring information so a machine can reason with it", "A type of hardware", "A network protocol"], "answer": 1},
                {"q": "What is the 'Turing Test' used to evaluate?",
                 "options": ["Internet speed", "A machine's ability to exhibit human-like intelligent behavior", "Database performance", "Code efficiency"], "answer": 1},
                {"q": "What is a 'rule-based system' in AI?",
                 "options": ["A system with no logic", "A system that uses if-then rules to make decisions", "A type of neural network only", "A database schema"], "answer": 1},
                {"q": "How does Machine Learning relate to AI?",
                 "options": ["They are unrelated fields", "ML is a subfield/technique used to achieve AI", "AI is a subfield of ML", "ML replaces AI entirely"], "answer": 1},
                {"q": "What is an 'agent' in the context of AI?",
                 "options": ["A salesperson", "Something that perceives its environment and takes actions", "A type of database", "A programming error"], "answer": 1},
            ],
        },
        {
            "step_title": "AI Search Algorithms",
            "questions": [
                {"q": "Which search algorithm explores all neighbor nodes before going deeper?",
                 "options": ["Depth-First Search", "Breadth-First Search", "A* Search", "Greedy Search"], "answer": 1},
                {"q": "What does the A* algorithm use to find the optimal path?",
                 "options": ["Only cost so far", "Only estimated distance to goal", "Both cost so far and a heuristic estimate", "Random guessing"], "answer": 2},
                {"q": "What is a heuristic in search algorithms?",
                 "options": ["A guaranteed exact solution", "An estimate used to guide the search efficiently", "A type of database index", "A programming error"], "answer": 1},
                {"q": "Which search strategy goes as deep as possible before backtracking?",
                 "options": ["Breadth-First Search", "Depth-First Search", "Uniform Cost Search", "Bidirectional Search"], "answer": 1},
                {"q": "What is the main drawback of Breadth-First Search?",
                 "options": ["It never finds a solution", "It can use a lot of memory storing all nodes at a level", "It only works on graphs", "It cannot be implemented"], "answer": 1},
            ],
        },
        {
            "step_title": "Problem Solving with AI",
            "questions": [
                {"q": "In AI problem solving, what is a 'state space'?",
                 "options": ["A physical room", "The set of all possible situations/configurations a problem can be in", "A type of database", "A CSS layout"], "answer": 1},
                {"q": "What is a 'goal state' in a search-based AI problem?",
                 "options": ["The starting configuration", "The desired outcome the search is trying to reach", "An error condition", "An unrelated random state"], "answer": 1},
                {"q": "What does 'constraint satisfaction' involve in AI problem solving?",
                 "options": ["Ignoring all rules", "Finding values that satisfy a set of given rules/constraints", "Only using neural networks", "Only visual data"], "answer": 1},
                {"q": "Why might a real-world AI problem be broken into smaller sub-problems?",
                 "options": ["To make it harder", "To make the problem more manageable and solvable step by step", "It's never done in practice", "To use more memory unnecessarily"], "answer": 1},
                {"q": "What is a practical example of AI-based problem solving?",
                 "options": ["A GPS app finding the shortest route", "A plain text document", "A static image with no logic", "A printed book"], "answer": 0},
            ],
        },
    ],
}


def get_static_assessment(topic: str, step_index: int, skill_level: str = "beginner"):
    """Return the {step_title, questions} block for a given topic + 0-based
    step index, using the same fuzzy topic matching style as the rest of
    the app (falls back gracefully if the topic/step isn't found).

    `skill_level` is accepted for forward-compatibility with callers in
    routes/assessment.py (which pass the learner's skill level), but the
    question bank below is not yet split per skill level — every level
    currently gets the same fixed steps for a topic. Wire this up if/when
    per-skill-level question banks are added.
    """
    topic_norm = (topic or "").strip().lower()

    steps = None
    if topic_norm in STATIC_ASSESSMENTS:
        steps = STATIC_ASSESSMENTS[topic_norm]
    else:
        for key in STATIC_ASSESSMENTS:
            if key in topic_norm or topic_norm in key:
                steps = STATIC_ASSESSMENTS[key]
                break

    if not steps:
        return None
    if step_index < 0 or step_index >= len(steps):
        step_index = step_index % len(steps)
    return steps[step_index]