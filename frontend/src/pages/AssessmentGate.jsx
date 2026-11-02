import React, { useState, useEffect } from "react";
import { getAssessmentUnlockStatus } from "../services/api";
import "../styles/Progress.css";
import { Lock, CheckCircle2 } from "lucide-react";

/**
 * Wrap your quiz/assessment UI with this component.
 * It only renders `children` if the assessment is unlocked;
 * otherwise it shows a locked banner explaining what's missing.
 *
 * Usage:
 *   <AssessmentGate userId={user.user_id} courseId={courseId}>
 *     <QuizTab ... />
 *   </AssessmentGate>
 */
export default function AssessmentGate({ userId, courseId, children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !courseId) return;
    setLoading(true);
    getAssessmentUnlockStatus(userId, courseId)
      .then(setStatus)
      .catch(() => setStatus({ video_watched: false, notes_completed: false, assessment_unlocked: false }))
      .finally(() => setLoading(false));
  }, [userId, courseId]);

  if (loading) return <div className="empty-mini">Checking assessment status...</div>;
  if (!status) return null;

  if (!status.assessment_unlocked) {
    return (
      <div className="unlock-banner locked">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Lock size={16} /> Assessment is locked</div>
          <div className="unlock-steps">
            <Step done={status.video_watched} label="Watch the video" />
            <Step done={status.notes_completed} label="Review study materials" />
            <Step done={false} label="Take the assessment" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="unlock-banner unlocked" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} /> Assessment unlocked — good luck!</div>
      {children}
    </>
  );
}

function Step({ done, label }) {
  return (
    <span className={`unlock-step ${done ? "complete" : ""}`}>
      <span className="unlock-step-icon">{done ? "✓" : ""}</span>
      {label}
    </span>
  );
}
