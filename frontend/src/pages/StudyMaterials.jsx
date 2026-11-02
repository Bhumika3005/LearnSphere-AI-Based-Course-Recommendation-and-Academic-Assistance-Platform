// Force hot-reload to register ClipboardCheck import
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast, getErrorMessage } from "../context/ToastContext.jsx";
import {
  getStudyMaterials,
  addStudyMaterial,
  updateVideoProgress,
  getVideoProgress,
  getVideos,
  getStaticAssessment,
  submitAssessment,
  getRecommendations,
} from "../services/api";
import "../styles/Dashboard.css";
import "../styles/Progress.css";
import {
  PlayCircle,
  FileText,
  BarChart3,
  Link2,
  ArrowLeftCircle,
  BookOpen,
  Search,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Award,
  RefreshCw,
  Lock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck
} from "lucide-react";

const TYPE_META = {
  video: { icon: <PlayCircle size={16} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />, label: "Video Lessons" },
  pdf: { icon: <FileText size={16} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />, label: "PDF Notes" },
  ppt: { icon: <BarChart3 size={16} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />, label: "PPT Materials" },
  link: { icon: <Link2 size={16} style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} />, label: "Reference Links" },
};

const EMPTY_MATERIALS = {
  videos: [],
  pdfs: [],
  ppts: [],
  references: [],
};

const DIRECT_VIDEO_REGEX = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2]?.length === 11 ? match[2] : null;
};

const isDirectVideoUrl = (url = "") => DIRECT_VIDEO_REGEX.test(url);

const normalizeVideo = (video = {}) => ({
  ...video,
  id: video.id ?? video.url ?? video.title,
  title: video.title || "Video Lesson",
  url: video.url || "",
  description: video.description || "",
  videoId: video.videoId || getYouTubeId(video.url) || null,
});

const slugifyCourse = (courseName = "") => courseName.trim().toLowerCase().replace(/\s+/g, "-");

const getFallbackPdfUrl = (courseName, slug, skillLevel = "beginner") => {
  if (slug.includes("python")) {
    if (skillLevel === "advanced") return "https://docs.python.org/3/howto/";
    if (skillLevel === "intermediate") return "https://python.swaroopch.com/";
    return "https://docs.python.org/3/tutorial/";
  }
  if (slug.includes("react")) {
    if (skillLevel === "advanced") return "https://react.dev/reference/react";
    if (skillLevel === "intermediate") return "https://react.dev/learn";
    return "https://react.dev/learn/tutorial-tic-tac-toe";
  }
  if (slug.includes("javascript") || slug.includes("js")) {
    if (skillLevel === "advanced") return "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference";
    if (skillLevel === "intermediate") return "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks";
    return "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps";
  }
  if (slug.includes("fastapi")) {
    if (skillLevel === "advanced") return "https://fastapi.tiangolo.com/deployment/";
    if (skillLevel === "intermediate") return "https://fastapi.tiangolo.com/advanced/";
    return "https://fastapi.tiangolo.com/tutorial/";
  }
  if (slug.includes("java")) {
    if (skillLevel === "advanced") return "https://docs.oracle.com/javase/tutorial/collections/streams/";
    if (skillLevel === "intermediate") return "https://www.baeldung.com/java-tutorial";
    return "https://dev.java/learn/";
  }
  if (slug.includes("machine-learning") || slug.includes("ml")) {
    if (skillLevel === "advanced") return "https://huggingface.co/learn";
    if (skillLevel === "intermediate") return "https://scikit-learn.org/stable/user_guide.html";
    return "https://www.kaggle.com/learn/intro-to-machine-learning";
  }
  if (slug.includes("artificial") || slug.includes("ai")) {
    if (skillLevel === "advanced") return "https://www.deeplearningbook.org/";
    if (skillLevel === "intermediate") return "https://developers.google.com/machine-learning/crash-course";
    return "https://www.coursera.org/learn/ai-for-everyone";
  }
  if (slug.includes("data-science") || courseName.toLowerCase().includes("data science")) {
    if (skillLevel === "advanced") return "https://jakevdp.github.io/PythonDataScienceHandbook/";
    if (skillLevel === "intermediate") return "https://www.kaggle.com/learn/pandas";
    return "https://www.kaggle.com/learn/python";
  }
  if (slug.includes("web")) {
    if (skillLevel === "advanced") return "https://web.dev/learn/performance/";
    if (skillLevel === "intermediate") return "https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/React_getting_started";
    return "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web";
  }
  return `https://www.tutorialspoint.com/${slug}/index.htm`;
};

const getFallbackPptUrl = (courseName, slug) => {
  if (slug.includes("python")) return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=python+programming";
  if (slug.includes("react")) return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=react+js";
  if (slug.includes("fastapi")) return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=fastapi";
  if (slug.includes("java")) return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=java+programming";
  if (slug.includes("javascript") || slug.includes("js")) return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=javascript";
  if (slug.includes("machine-learning") || slug.includes("ml")) return "https://www.slideshare.net/search/slideshow?searchfrom=header&q=machine+learning";
  return `https://www.slideshare.net/search/slideshow?searchfrom=header&q=${courseName.replace(/\s+/g, "+")}`;
};

const getFallbackReferenceUrl = (slug) => {
  if (slug.includes("react")) return "https://react.dev";
  if (slug.includes("python")) return "https://docs.python.org/3/";
  if (slug.includes("fastapi")) return "https://fastapi.tiangolo.com";
  if (slug.includes("javascript") || slug.includes("js")) return "https://developer.mozilla.org/en-US/docs/Web/JavaScript";
  if (slug.includes("java")) return "https://docs.oracle.com/en/java/";
  if (slug.includes("machine-learning") || slug.includes("ml")) return "https://scikit-learn.org/stable/";
  if (slug.includes("sql") || slug.includes("database")) return "https://www.w3schools.com/sql/";
  return `https://www.w3schools.com/${slug}/`;
};

const getFallbackVideoUrl = (slug, skillLevel = "beginner") => {
  if (slug.includes("python")) {
    if (skillLevel === "advanced") return "https://www.youtube.com/watch?v=7lmCu8wz8RE";
    if (skillLevel === "intermediate") return "https://www.youtube.com/watch?v=QX1E7p-4vHU";
    return "https://www.youtube.com/watch?v=kqtD5dpn9C8";
  }
  if (slug.includes("react") || slug.includes("web") || slug.includes("javascript") || slug.includes("js")) {
    if (skillLevel === "advanced") return "https://www.youtube.com/watch?v=YPiQtdb0RRA";
    if (skillLevel === "intermediate") return "https://www.youtube.com/watch?v=w7ejDZ8SWv8";
    return "https://www.youtube.com/watch?v=Q33KBiDriJY";
  }
  if (slug.includes("java")) {
    if (skillLevel === "advanced") return "https://www.youtube.com/watch?v=8N1pM4lVJxk";
    if (skillLevel === "intermediate") return "https://www.youtube.com/watch?v=grEKMHGY3RA";
    return "https://www.youtube.com/watch?v=eIrMbAQSU34";
  }
  if (slug.includes("ai") || slug.includes("artificial")) {
    if (skillLevel === "advanced") return "https://www.youtube.com/watch?v=QH15-F9w9ng";
    if (skillLevel === "intermediate") return "https://www.youtube.com/watch?v=2ePf9rue1Ao";
    return "https://www.youtube.com/watch?v=JMUxmLyrhSk";
  }
  if (slug.includes("machine-learning") || slug.includes("ml") || slug.includes("data-science")) {
    if (skillLevel === "advanced") return "https://www.youtube.com/watch?v=IHZwWFHWa5w";
    if (skillLevel === "intermediate") return "https://www.youtube.com/watch?v=nKW8Ndu7Mjw";
    return "https://www.youtube.com/watch?v=GwIo3gDZCVQ";
  }
  if (skillLevel === "advanced") return "https://www.youtube.com/watch?v=7lmCu8wz8RE";
  if (skillLevel === "intermediate") return "https://www.youtube.com/watch?v=QX1E7p-4vHU";
  return "https://www.youtube.com/watch?v=aqvD3tcZLUI";
};

const buildFallbackMaterials = (courseName, skillLevel = "beginner") => {
  const slug = slugifyCourse(courseName);
  if (!slug) return EMPTY_MATERIALS;

  return {
    videos: [
      {
        id: `${slug}-video`,
        title: `${courseName} — ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} Video Lesson`,
        type: "video",
        url: getFallbackVideoUrl(slug, skillLevel),
        description: `A ${skillLevel}-friendly video lesson for ${courseName}.`,
        skill_level: skillLevel,
      },
    ],
    pdfs: [
      {
        id: `${slug}-pdf`,
        title: `${courseName} — ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} PDF Notes`,
        type: "pdf",
        url: getFallbackPdfUrl(courseName, slug, skillLevel),
        description: `Topic-based ${skillLevel} PDF notes and reading material for ${courseName}.`,
        skill_level: skillLevel,
      },
    ],
    ppts: [
      {
        id: `${slug}-ppt`,
        title: `${courseName} — Lecture Slides`,
        type: "ppt",
        url: getFallbackPptUrl(courseName, slug),
        description: `Slide deck covering key concepts and applications of ${courseName}.`,
        skill_level: skillLevel,
      },
    ],
    references: [
      {
        id: `${slug}-reference`,
        title: `${courseName} — Official Documentation`,
        type: "link",
        url: getFallbackReferenceUrl(slug),
        description: `Official documentation and learning resources for ${courseName}.`,
        skill_level: skillLevel,
      },
    ],
  };
};

const mergeMaterialList = (primary = [], fallback = []) => {
  const merged = [...primary, ...fallback].filter((item) => item?.url);
  const seen = new Set();

  return merged.filter((item) => {
    const key = `${item.type || ""}|${item.url}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeVideos = (manualVideos = [], fetchedVideos = []) => {
  const merged = [...manualVideos, ...fetchedVideos]
    .map(normalizeVideo)
    .filter((video) => video.url);

  const seen = new Set();

  return merged.filter((video) => {
    const key = video.url.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function StudyMaterials({ courseId, courseTitle, onProgressUpdate }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [courseInput, setCourseInput] = useState("");
  const [searchedCourse, setSearchedCourse] = useState("");
  const [materials, setMaterials] = useState(EMPTY_MATERIALS);
  const [activeType, setActiveType] = useState("video");
  const [loading, setLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    type: "pdf",
    url: "",
    description: "",
  });
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [skillLevel, setSkillLevel] = useState("beginner");

  // Inline assessment states
  const [assessmentState, setAssessmentState] = useState("idle"); // idle, loading, active, result
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [assessmentStepIndex, setAssessmentStepIndex] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [showAssessmentDetails, setShowAssessmentDetails] = useState(false);
  const [assessmentCurrentQuestion, setAssessmentCurrentQuestion] = useState(0);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);
  const [activeAssessmentVideoUrl, setActiveAssessmentVideoUrl] = useState(null);

  const loadMaterialsForCourse = useCallback(async (courseName) => {
    const trimmed = courseName.trim();
    if (!trimmed) return;

    setSearchedCourse(trimmed);
    setLoading(true);
    setVideoStatus({});

    // Log this as a search so it shows up in Activity Summary / weekly &
    // monthly activity charts. This is the app's main "search" action
    // (looking up a course's resources) but it never called anything that
    // wrote to search_history — fire-and-forget so a failure here never
    // blocks the actual materials from loading.
    if (user?.user_id) {
      getRecommendations(trimmed, user.user_id).catch(() => {});
    }

    try {
      const [materialResult, videoResult] = await Promise.allSettled([
        getStudyMaterials(trimmed, skillLevel),
        getVideos(trimmed, skillLevel),
      ]);

      const grouped =
        materialResult.status === "fulfilled"
          ? materialResult.value?.grouped || EMPTY_MATERIALS
          : EMPTY_MATERIALS;

      const fetchedVideos =
        videoResult.status === "fulfilled" ? videoResult.value?.videos || [] : [];

      const combinedVideos = mergeVideos(grouped.videos, fetchedVideos);
      const fallbackMaterials = buildFallbackMaterials(trimmed, skillLevel);

      const nextMaterials = {
        videos: combinedVideos,
        pdfs: mergeMaterialList(grouped.pdfs || [], fallbackMaterials.pdfs),
        ppts: mergeMaterialList(grouped.ppts || [], fallbackMaterials.ppts),
        references: mergeMaterialList(grouped.references || [], fallbackMaterials.references),
      };

      setMaterials(nextMaterials);

      if (combinedVideos.length > 0) {
        setActiveType("video");
      } else if (nextMaterials.pdfs.length > 0) {
        setActiveType("pdf");
      } else if (nextMaterials.ppts.length > 0) {
        setActiveType("ppt");
      } else {
        setActiveType("link");
      }

      if (user?.user_id && combinedVideos.length > 0) {
        const progressResults = await Promise.allSettled(
          combinedVideos.map((video) =>
            getVideoProgress(user.user_id, trimmed, video.url).then((progress) => ({
              url: video.url,
              completed: progress.completed,
            }))
          )
        );

        const nextStatus = {};
        progressResults.forEach((result) => {
          if (result.status === "fulfilled") {
            nextStatus[result.value.url] = result.value.completed;
          }
        });
        setVideoStatus(nextStatus);
      }
    } catch (error) {
      console.error(error);
      setMaterials(EMPTY_MATERIALS);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, skillLevel]);

  useEffect(() => {
    const queryCourse = searchParams.get("course");
    if (queryCourse) {
      setCourseInput(queryCourse);
      loadMaterialsForCourse(queryCourse);
    }
  }, [searchParams, courseId, courseTitle, loadMaterialsForCourse]);
  useEffect(() => {
     if (searchedCourse) {
       loadMaterialsForCourse(searchedCourse);
     }
  }, [skillLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    loadMaterialsForCourse(courseInput);
  };

  const handleMarkVideoCompleted = async (videoUrl) => {
    if (!user?.user_id || !searchedCourse) return;

    try {
      await updateVideoProgress({
        user_id: user.user_id,
        course_title: searchedCourse,
        video_id: videoUrl,
        completed: true,
        watched_percentage: 100.0,
        skill_level: skillLevel,
      });
      setVideoStatus((prev) => ({ ...prev, [videoUrl]: true }));
      // Notify other parts of the app that progress changed so they can reload
      try {
        window.dispatchEvent(new CustomEvent("progressUpdated", {
          detail: { userId: user.user_id, courseTitle: searchedCourse }
        }));
      } catch (e) {
        // ignore in non-browser test environments
      }

      handleStartInlineAssessment(videoUrl);
    } catch (error) {
      console.error(error);
      showToast("Failed to update video progress: " + getErrorMessage(error, error.message), "error");
    }
  };

  const handleStartInlineAssessment = async (videoUrl) => {
    setActiveAssessmentVideoUrl(videoUrl);
    setAssessmentState("loading");
    setAssessmentCurrentQuestion(0);
    setAssessmentAnswers({});
    setAssessmentResult(null);
    const stepIndex = Math.max(0, (materials.videos || []).findIndex(v => v.url === videoUrl));
    try {
      const data = await getStaticAssessment(searchedCourse, stepIndex, user?.user_id, videoUrl, skillLevel);
      if (data && data.questions) {
        setAssessmentQuestions(data.questions);
        setAssessmentStepIndex(stepIndex);
        setAssessmentState("active");
      } else {
        showToast("Failed to load assessment. Try again.", "error");
        setAssessmentState("idle");
      }
    } catch (err) {
      console.error(err);
      showToast(
        getErrorMessage(err, "This step's assessment is locked until its video is completed."),
        "error"
      );
      setAssessmentState("idle");
    }
  };

  const handleSelectInlineOption = (qIdx, optIdx) => {
    setAssessmentAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitInlineAssessment = async () => {
    const answeredCount = Object.keys(assessmentAnswers).length;
    if (answeredCount < assessmentQuestions.length) {
      showToast("Please answer all questions before submitting.", "error");
      return;
    }

    setAssessmentSubmitting(true);
    try {
      const userAnswers = [];
      assessmentQuestions.forEach((q, idx) => {
        userAnswers.push(assessmentAnswers[idx]);
      });

      const res = await submitAssessment({
        user_id: user.user_id,
        course_name: searchedCourse,
        topic: searchedCourse,
        step_index: assessmentStepIndex,
        answers: userAnswers,
      });

      setAssessmentResult(res);
      setAssessmentState("result");
      try {
        window.dispatchEvent(new CustomEvent("progressUpdated", {
          detail: { userId: user.user_id, courseTitle: searchedCourse }
        }));
      } catch (e) {
        // ignore in non-browser/test environments
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to submit assessment.", "error");
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.title || !addForm.url || !searchedCourse) {
      showToast("Please search for a course first, then fill in Title and URL.", "error");
      return;
    }

    setAdding(true);

    try {
      await addStudyMaterial({ ...addForm, course_title: searchedCourse });
      setAddSuccess(true);
      setAddForm({ title: "", type: "pdf", url: "", description: "" });
      setShowAddForm(false);
      setTimeout(() => setAddSuccess(false), 3000);
      loadMaterialsForCourse(searchedCourse);
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to add material."), "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <main className="main-content" style={{ marginLeft: 0, width: "100%" }}>
        <div className="topbar">
          <h1 className="topbar-title"><BookOpen size={24} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Course Study Materials</h1>
          <button className="nav-btn" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeftCircle size={16} /> Back to Dashboard
          </button>
        </div>

        <div className="tab-content" style={{ padding: "1.5rem" }}>
          <div className="section-header">
            <h2><BookOpen size={20} className="inline-icon" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} /> Find Course Resources</h2>
            <p>Search any course to automatically fetch videos, notes, PPTs, and reference materials</p>
          </div>

          <div className="search-bar" style={{ marginBottom: "2rem" }}>
            <input
              className="search-input"
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Python Programming, React Basics, FastAPI..."
            />
            <select
              className="search-input"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              style={{ marginLeft: "0.5rem", width: "auto", minWidth: "150px" }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button className="search-btn" onClick={handleSearch} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Search size={16} /> Find Materials
            </button>
          </div>

          {addSuccess && (
            <div className="success-msg" style={{ marginBottom: "1rem" }}>
              <CheckCircle2 size={16} className="inline-icon" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }} /> Material added successfully!
            </div>
          )}

          {loading && <div className="empty-mini">Searching and loading study materials...</div>}

          {!loading && searchedCourse && (
            <>
              <div className="material-type-tabs" style={{ marginBottom: "1.5rem" }}>
                {Object.entries(TYPE_META).map(([key, meta]) => {
                  const count = materials[key === "link" ? "references" : `${key}s`]?.length || 0;
                  return (
                    <button
                      key={key}
                      className={`material-type-tab ${activeType === key ? "active" : ""}`}
                      onClick={() => setActiveType(key)}
                    >
                      {meta.icon} {meta.label} ({count})
                    </button>
                  );
                })}
              </div>

              {user?.is_admin === 1 && (
                <div style={{ marginBottom: "1rem" }}>
                  <button
                    className="search-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ background: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {showAddForm ? "✕ Cancel" : <><PlusCircle size={14} /> Add Course Material</>}
                  </button>
                </div>
              )}

              {showAddForm && (
                <div
                  className="feedback-form-card"
                  style={{
                    marginBottom: "1.5rem",
                    background: "white",
                    padding: "1.5rem",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3>Add Resource for "{searchedCourse}"</h3>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      className="form-input"
                      value={addForm.title}
                      onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                      placeholder="e.g. FastAPI Cheat Sheet"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      className="form-input"
                      value={addForm.type}
                      onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    >
                      {Object.entries(TYPE_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>URL</label>
                    <input
                      className="form-input"
                      value={addForm.url}
                      onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      className="form-input"
                      value={addForm.description}
                      onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                      placeholder="Short description"
                    />
                  </div>
                  <button className="search-btn" onClick={handleAdd} disabled={adding}>
                    {adding ? "Adding..." : "Add Resource"}
                  </button>
                </div>
              )}

              {activeType === "video" && (
                <div>
                  {materials.videos.length === 0 ? (
                    <div className="empty-mini">No video lessons available.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                      {materials.videos.map((video, index) => {
                        const ytId = video.videoId || getYouTubeId(video.url);
                        const completed = videoStatus[video.url] || false;
                        const playableDirectVideo = !ytId && isDirectVideoUrl(video.url);

                        return (
                          <div
                            key={video.id || `${video.url}-${index}`}
                            style={{
                              background: "white",
                              border: "1px solid var(--border)",
                              borderRadius: "16px",
                              padding: "1.5rem",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                            }}
                          >
                            <h3 style={{ margin: "0 0 1rem", fontFamily: "Sora, sans-serif", fontWeight: 700 }}>
                              {video.title}
                            </h3>

                            {ytId ? (
                              <div
                                style={{
                                  position: "relative",
                                  paddingBottom: "56.25%",
                                  height: 0,
                                  overflow: "hidden",
                                  borderRadius: "12px",
                                  border: "1px solid var(--border)",
                                  marginBottom: "1rem",
                                }}
                              >
                                <iframe
                                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title={video.title}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            ) : playableDirectVideo ? (
                              <video
                                controls
                                onEnded={() => handleMarkVideoCompleted(video.url)}
                                style={{
                                  width: "100%",
                                  maxHeight: "420px",
                                  borderRadius: "12px",
                                  border: "1px solid var(--border)",
                                  marginBottom: "1rem",
                                  background: "#000",
                                }}
                              >
                                <source src={video.url} />
                                Your browser does not support video playback.
                              </video>
                            ) : (
                              <p style={{ margin: "0 0 1rem" }}>
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "var(--primary)", fontWeight: 700 }}
                                >
                                  Open Video Link in New Tab
                                </a>
                              </p>
                            )}

                            {video.description && (
                              <p
                                style={{
                                  color: "var(--muted)",
                                  fontSize: "0.9rem",
                                  lineHeight: "1.4",
                                  margin: "0 0 1rem",
                                }}
                              >
                                {video.description}
                              </p>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderTop: "1px solid var(--border)",
                                paddingTop: "1rem",
                              }}
                            >
                              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                                Status:{" "}
                                {completed ? (
                                  <strong style={{ color: "var(--success)", display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckCircle2 size={14} /> Completed</strong>
                                ) : (
                                  <strong style={{ color: "var(--warning)" }}>Pending Watch</strong>
                                )}
                              </span>

                              {!completed ? (
                                <button
                                  className="nav-btn"
                                  style={{ background: "var(--success)" }}
                                  onClick={() => handleMarkVideoCompleted(video.url)}
                                >
                                  Mark Video as Completed
                                </button>
                              ) : (
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                  <button
                                    className="nav-btn"
                                    style={{ background: "var(--success)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                    onClick={() => handleStartInlineAssessment(video.url)}
                                  >
                                    <ClipboardCheck size={14} /> Start Assessment
                                  </button>
                                  <button
                                    className="nav-btn"
                                    style={{ background: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                    onClick={() => navigate("/dashboard?tab=quiz")}
                                  >
                                    <ClipboardCheck size={14} /> More Practice: Quiz Tab
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Inline Assessment UI Block */}
                            {completed && activeAssessmentVideoUrl === video.url && assessmentState !== "idle" && (
                              <div
                                style={{
                                  marginTop: "1.5rem",
                                  borderTop: "2px solid var(--border)",
                                  paddingTop: "1.5rem",
                                }}
                              >
                                {assessmentState === "loading" && (
                                  <div style={{ textAlign: "center", padding: "2rem" }}>
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--primary)" }}><RefreshCw size={32} className="spin" /></div>
                                    <h4 style={{ margin: 0, fontFamily: "Sora, sans-serif" }}>Generating AI Questions...</h4>
                                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                                      Please wait while Gemini designs your custom test.
                                    </p>
                                  </div>
                                )}

                                {assessmentState === "active" && assessmentQuestions.length > 0 && (
                                  <div
                                    style={{
                                      background: "var(--bg)",
                                      padding: "1.25rem",
                                      borderRadius: "12px",
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                      <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>
                                        Question {assessmentCurrentQuestion + 1} of {assessmentQuestions.length}
                                      </span>
                                      <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>
                                        {Math.round((Object.keys(assessmentAnswers).length / assessmentQuestions.length) * 100)}% Answered
                                      </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ width: "100%", height: "4px", background: "var(--border)", borderRadius: "2px", marginBottom: "1.25rem", overflow: "hidden" }}>
                                      <div style={{ width: `${((assessmentCurrentQuestion + 1) / assessmentQuestions.length) * 100}%`, height: "100%", background: "var(--primary)", transition: "width 0.2s" }} />
                                    </div>

                                    {/* Question & Options */}
                                    {(() => {
                                      const q = assessmentQuestions[assessmentCurrentQuestion];
                                      return (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                                          <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--dark)", lineHeight: "1.4" }}>
                                            Q{assessmentCurrentQuestion + 1}. {q.question}
                                          </h4>
                                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            {q.options.map((opt, optIdx) => (
                                              <div
                                                key={optIdx}
                                                onClick={() => handleSelectInlineOption(assessmentCurrentQuestion, optIdx)}
                                                style={{
                                                  padding: "0.75rem 1rem",
                                                  borderRadius: "10px",
                                                  border: assessmentAnswers[assessmentCurrentQuestion] === optIdx ? "2px solid var(--primary)" : "1px solid var(--border)",
                                                  background: assessmentAnswers[assessmentCurrentQuestion] === optIdx ? "#f5f7ff" : "white",
                                                  cursor: "pointer",
                                                  fontWeight: 600,
                                                  color: "var(--dark)",
                                                  fontSize: "0.9rem",
                                                  transition: "all 0.15s",
                                                }}
                                              >
                                                <span style={{ marginRight: "0.5rem", color: assessmentAnswers[assessmentCurrentQuestion] === optIdx ? "var(--primary)" : "var(--muted)" }}>
                                                  {String.fromCharCode(65 + optIdx)}.
                                                </span>
                                                {opt}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Navigation */}
                                    <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                                      <button
                                        className="nav-btn"
                                        style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                                        onClick={() => setAssessmentCurrentQuestion(prev => Math.max(0, prev - 1))}
                                        disabled={assessmentCurrentQuestion === 0}
                                        type="button"
                                      >
                                        ← Prev
                                      </button>
                                      
                                      <button
                                        className="nav-btn"
                                        style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", background: "none", color: "var(--dark)", border: "1px solid var(--border)" }}
                                        onClick={() => setAssessmentState("idle")}
                                        type="button"
                                      >
                                        Cancel
                                      </button>

                                      {assessmentCurrentQuestion < assessmentQuestions.length - 1 ? (
                                        <button
                                          className="nav-btn"
                                          style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", background: "var(--primary)" }}
                                          onClick={() => setAssessmentCurrentQuestion(prev => prev + 1)}
                                          type="button"
                                        >
                                          Next →
                                        </button>
                                      ) : (
                                        <button
                                          className="nav-btn"
                                          style={{ padding: "0.4rem 1.25rem", fontSize: "0.85rem", background: "var(--success)" }}
                                          onClick={handleSubmitInlineAssessment}
                                          disabled={assessmentSubmitting}
                                          type="button"
                                        >
                                          {assessmentSubmitting ? "Submitting..." : "Submit ✓"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {assessmentState === "result" && assessmentResult && (
                                  <div
                                    style={{
                                      background: "var(--bg)",
                                      padding: "1.5rem",
                                      borderRadius: "12px",
                                      border: "1px solid var(--border)",
                                      textAlign: "center",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                                      {assessmentResult.passed ? <Award size={32} style={{ color: "#f59e0b" }} /> : <XCircle size={32} style={{ color: "#dc2626" }} />}
                                    </div>
                                    <h4 style={{ margin: 0, fontFamily: "Sora, sans-serif", fontSize: "1.2rem" }}>
                                      {assessmentResult.passed ? "Assessment Passed!" : "Assessment Failed"}
                                    </h4>
                                    <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0.25rem 0 1rem" }}>
                                      You scored {assessmentResult.score}% (Correct: {assessmentResult.correct} / {assessmentResult.total})
                                    </p>
                                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
                                      Finish this assessment first, then use the Quiz tab if you want extra practice.
                                    </p>

                                    {/* Detailed Results Section */}
                                    {assessmentResult.detailed_results && assessmentResult.detailed_results.length > 0 && (
                                      <div style={{ textAlign: "left", marginBottom: "1rem" }}>
                                        <button
                                          onClick={() => setShowAssessmentDetails(!showAssessmentDetails)}
                                          style={{
                                            background: "white",
                                            border: "1px solid var(--border)",
                                            padding: "0.5rem 1rem",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            color: "var(--dark)",
                                            marginBottom: "0.75rem",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                          }}
                                        >
                                          {showAssessmentDetails ? <><ChevronDown size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} /> Hide</> : <><ChevronRight size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} /> Show</>} Detailed Results
                                        </button>

                                        {showAssessmentDetails && (
                                          <div style={{ background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                            {assessmentResult.detailed_results.map((item, idx) => (
                                              <div
                                                key={idx}
                                                style={{
                                                  padding: "0.75rem",
                                                  marginBottom: idx < assessmentResult.detailed_results.length - 1 ? "0.75rem" : "0",
                                                  background: "var(--bg)",
                                                  borderRadius: "6px",
                                                  border: `1px solid ${item.is_correct ? "var(--success)" : "var(--danger)"}`,
                                                }}
                                              >
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                                  <span style={{ display: "flex", alignItems: "center" }}>{item.is_correct ? <CheckCircle2 size={16} style={{ color: "var(--success)" }} /> : <XCircle size={16} style={{ color: "var(--danger)" }} />}</span>
                                                  <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Q{idx + 1}</span>
                                                </div>
                                                <div style={{ fontSize: "0.8rem", marginBottom: "0.5rem", color: "var(--dark)" }}>
                                                  {item.question}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                                                  <strong>Your answer:</strong> {item.options[item.user_answer] || "Not answered"}
                                                </div>
                                                {!item.is_correct && (
                                                  <div style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>
                                                    <strong>Correct answer:</strong> {item.options[item.correct_answer]}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                                      <button
                                        className="nav-btn"
                                        style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                                        onClick={() => handleStartInlineAssessment(video.url)}
                                        type="button"
                                      >
                                        Retake Assessment
                                      </button>
                                      <button
                                        className="nav-btn"
                                        style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", background: "var(--primary)" }}
                                        onClick={() => navigate("/dashboard?tab=quiz")}
                                        type="button"
                                      >
                                        More Practice: Quiz Tab
                                      </button>
                                      <button
                                        className="nav-btn"
                                        style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", background: "var(--dark)" }}
                                        onClick={() => navigate("/progress")}
                                        type="button"
                                      >
                                        View Progress
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeType === "pdf" && (
                <div className="materials-grid">
                  {materials.pdfs.length === 0 ? (
                    <div className="empty-mini">No PDF materials seeded.</div>
                  ) : (
                    materials.pdfs.map((material) => (
                      <div className="material-card" key={material.id}>
                        <div className="material-icon pdf" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><FileText size={24} /></div>
                        <div className="material-body">
                          <div className="material-title">{material.title}</div>
                          {material.description && <div className="material-desc">{material.description}</div>}
                          <a href={material.url} target="_blank" rel="noopener noreferrer" className="material-link">
                            Open PDF Notes →
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeType === "ppt" && (
                <div className="materials-grid">
                  {materials.ppts.length === 0 ? (
                    <div className="empty-mini">No PPT slides seeded.</div>
                  ) : (
                    materials.ppts.map((material) => (
                      <div className="material-card" key={material.id}>
                        <div className="material-icon ppt" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><BarChart3 size={24} /></div>
                        <div className="material-body">
                          <div className="material-title">{material.title}</div>
                          {material.description && <div className="material-desc">{material.description}</div>}
                          <a href={material.url} target="_blank" rel="noopener noreferrer" className="material-link">
                            Open Lecture Slides →
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeType === "link" && (
                <div className="materials-grid">
                  {materials.references.length === 0 ? (
                    <div className="empty-mini">No reference links available.</div>
                  ) : (
                    materials.references.map((material) => (
                      <div className="material-card" key={material.id}>
                        <div className="material-icon link" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}><Link2 size={24} /></div>
                        <div className="material-body">
                          <div className="material-title">{material.title}</div>
                          {material.description && <div className="material-desc">{material.description}</div>}
                          <a href={material.url} target="_blank" rel="noopener noreferrer" className="material-link">
                            Open Documentation →
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {!searchedCourse && !loading && (
            <div className="empty-state-large">
              <div className="eil-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "var(--muted)" }}><BookOpen size={32} /></div>
              <h3>Search or Select a Course</h3>
              <p>Type a course title above to load its educational materials.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}