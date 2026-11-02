# Frontend Integration Guide — New Components

This package adds 5 new React components + extends `api.js` to talk to
the 15 new backend endpoints (Study Materials, Progress, Video Progress,
Assessment Unlock, Certificates, Analytics).

**None of your existing files are overwritten except `api.js`** (which
is a strict superset — every original function is still there,
unchanged, plus the new ones appended at the bottom).

---

## 1. What's in this package

```
src/
├── services/
│   └── api.js                    ← REPLACES your old api.js (all old + new functions)
├── styles/
│   └── Progress.css               ← NEW stylesheet, uses your existing CSS variables
└── pages/
    ├── StudyMaterials.jsx         ← NEW: shows PDF/PPT/Link/Video/Practice materials
    ├── CourseProgress.jsx         ← NEW: progress bar + 3 milestones (40/30/30)
    ├── AssessmentGate.jsx         ← NEW: locks quiz until video+materials done
    ├── Certificates.jsx           ← NEW: certificate generation + list
    └── AnalyticsDashboard.jsx     ← NEW: analytics tab with bar charts (no chart library needed)
```

---

## 2. Step-by-step install

### Step 1 — Replace `api.js`

Copy `src/services/api.js` from this package over your existing one.
It contains everything your old file had, plus 15 new functions at the
bottom (study materials, progress, video progress, assessment,
certificates, analytics).

### Step 2 — Add the new stylesheet

Copy `src/styles/Progress.css` into your `src/styles/` folder.
It reuses your existing CSS variables (`--primary`, `--dark`, `--surface`,
etc. from `Dashboard.css`), so colors/fonts match automatically.

### Step 3 — Add the 5 new component files

Copy all 5 files into your `src/pages/` folder:
- `StudyMaterials.jsx`
- `CourseProgress.jsx`
- `AssessmentGate.jsx`
- `Certificates.jsx`
- `AnalyticsDashboard.jsx`

### Step 4 — Add a new "Analytics" tab to your sidebar

Open `Dashboard.jsx`, find the `TABS` array near the top:

```jsx
const TABS = [
  { id: "overview",  label: "Overview",      icon: "🏠" },
  { id: "courses",   label: "Courses",       icon: "📚" },
  { id: "path",      label: "Learning Path", icon: "🗺️" },
  { id: "quiz",      label: "Quiz",          icon: "📝" },
  { id: "history",   label: "History",       icon: "🕐" },
  { id: "feedback",  label: "Feedback",      icon: "⭐" },
  { id: "ai",        label: "AI Chat",       icon: "🤖" },
];
```

Add one new entry:

```jsx
const TABS = [
  { id: "overview",  label: "Overview",      icon: "🏠" },
  { id: "courses",   label: "Courses",       icon: "📚" },
  { id: "path",      label: "Learning Path", icon: "🗺️" },
  { id: "quiz",      label: "Quiz",          icon: "📝" },
  { id: "history",   label: "History",       icon: "🕐" },
  { id: "feedback",  label: "Feedback",      icon: "⭐" },
  { id: "ai",        label: "AI Chat",       icon: "🤖" },
  { id: "analytics", label: "Analytics",     icon: "📊" },   {/* ← NEW */}
];
```

### Step 5 — Import the new component at the top of `Dashboard.jsx`

```jsx
import AnalyticsDashboard from "./AnalyticsDashboard";
```

### Step 6 — Render it in the tab-switch section

Find this block near the bottom of `Dashboard.jsx`:

```jsx
{tab === "overview" && <OverviewTab user={user} stats={stats} history={history} setTab={setTab} />}
{tab === "courses"  && <CoursesTab  user={user} onFeedback={openFeedback} />}
{tab === "path"     && <LearningPathTab user={user} />}
{tab === "quiz"     && <QuizTab     user={user} />}
{tab === "history"  && <HistoryTab  user={user} />}
{tab === "feedback" && <FeedbackTab user={user} prefillCourse={feedbackCourse} />}
{tab === "ai"        && <AIChatTab user={user} />}
```

Add:

```jsx
{tab === "analytics" && <AnalyticsDashboard userId={user?.user_id} />}
```

---

## 3. Embedding Study Materials, Progress, and Assessment Gate into a course view

These 3 components are designed to be embedded wherever you show course
detail (for example, inside `CourseCard` when expanded, or a future
`CourseDetail` page). Here is a minimal usage example:

```jsx
import CourseProgress from "./CourseProgress";
import StudyMaterials from "./StudyMaterials";
import AssessmentGate from "./AssessmentGate";
import Certificates from "./Certificates";

function CourseDetailView({ user, course }) {
  const courseId = course.title; // or a stable course_id if you have one

  return (
    <div>
      <CourseProgress
        userId={user.user_id}
        courseId={courseId}
        courseTitle={course.title}
      />

      <h3>Study Materials</h3>
      <StudyMaterials courseId={courseId} />

      <h3>Assessment</h3>
      <AssessmentGate userId={user.user_id} courseId={courseId}>
        {/* put your existing QuizTab or a course-specific quiz UI here */}
        <QuizTab user={user} />
      </AssessmentGate>

      <h3>Certificate</h3>
      <Certificates
        userId={user.user_id}
        courseId={courseId}
        courseName={course.title}
      />
    </div>
  );
}
```

**Important:** `course_id` in the backend is just a `TEXT` field — you
can use the course title itself as the ID (simplest, works with your
current dataset which has no numeric course IDs), or generate a slug.
Just be consistent: the same `course_id` string must be used across
`StudyMaterials`, `CourseProgress`, `AssessmentGate`, and `Certificates`
for a given course.

---

## 4. Marking progress as the user interacts with a course

Call `updateProgress(...)` from `api.js` whenever a milestone happens.
Examples:

```jsx
import { updateProgress, updateVideoProgress } from "../services/api";

// When the user finishes watching a course video:
await updateVideoProgress({
  user_id: user.user_id,
  video_id: video.videoId,
  course_id: courseId,
  completed: true,
  watched_percentage: 100,
});
// This automatically also sets video_watched=true on course_progress.

// When the user has scrolled through / viewed study materials:
await updateProgress({
  user_id: user.user_id,
  course_id: courseId,
  notes_completed: true,
});

// Quiz completion is handled automatically by submitAssessment()
// in AssessmentGate's quiz flow — no manual call needed there.
```

---

## 5. What was tested in this sandbox

- ✅ All 5 new `.jsx` files pass Babel's React-preset syntax check
  (valid JSX, valid JS, no syntax errors)
- ✅ The merged `api.js` passes Node's ES-module syntax check
- ✅ Every new component only imports functions that exist in the
  merged `api.js`, and every function name matches a real backend
  endpoint from the v3 backend package exactly (verified by
  cross-referencing both packages' route paths)

**Could not test in this sandbox:** actually rendering these components
in a live browser against your real Supabase data, since that requires
your local `npm start` + your real backend running + your real
database. Test the full flow locally: open a course → see progress bar
→ view study materials → confirm quiz locked → watch video → confirm
quiz unlocks → pass quiz → confirm certificate becomes available.
