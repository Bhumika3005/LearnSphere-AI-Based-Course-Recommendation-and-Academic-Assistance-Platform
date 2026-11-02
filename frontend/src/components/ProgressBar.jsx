import React from "react";

export default function ProgressBar({ percentage = 0, size = 120, strokeWidth = 10, color = "var(--primary, #6366f1)" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--bg-card-border, #e2e8f0)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.8s ease-in-out",
          }}
        />
      </svg>
      {/* Center Text */}
      <div
        style={{
          position: "absolute",
          fontSize: `${size * 0.18}px`,
          fontWeight: "700",
          color: "var(--text-main, #1e293b)",
          fontFamily: "Outfit, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Math.round(clampedPercentage)}%
      </div>
    </div>
  );
}
