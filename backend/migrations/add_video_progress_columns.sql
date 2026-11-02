-- Migration: Fix database schema for course_progress, video_progress, and quiz_results tables
-- Run this in Supabase SQL Editor to fix the database schema

-- First, drop any existing course_progress table and recreate it with correct schema
DROP TABLE IF EXISTS course_progress CASCADE;

-- Recreate course_progress table with correct schema
CREATE TABLE course_progress (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_title        TEXT NOT NULL,
    progress_percentage INT DEFAULT 0,
    completed           BOOLEAN DEFAULT FALSE,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, course_title)
);

-- Drop and recreate video_progress table with correct schema
DROP TABLE IF EXISTS video_progress CASCADE;

-- Recreate video_progress table with correct schema
CREATE TABLE video_progress (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_title        TEXT NOT NULL,
    video_id            TEXT NOT NULL,
    completed           BOOLEAN DEFAULT FALSE,
    watched_percentage  NUMERIC DEFAULT 0,
    skill_level         VARCHAR(20) DEFAULT 'beginner',
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, course_title, video_id)
);

-- Drop and recreate quiz_results table with correct schema
DROP TABLE IF EXISTS quiz_results CASCADE;

-- Recreate quiz_results table with correct schema
CREATE TABLE quiz_results (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_title  TEXT NOT NULL,
    score         INT NOT NULL,
    passed        BOOLEAN NOT NULL,
    taken_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add skill_level column to study_materials if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'study_materials' 
        AND column_name = 'skill_level'
    ) THEN
        ALTER TABLE study_materials ADD COLUMN skill_level VARCHAR(20) DEFAULT 'beginner';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_skill ON video_progress(skill_level);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_skill ON study_materials(skill_level);
