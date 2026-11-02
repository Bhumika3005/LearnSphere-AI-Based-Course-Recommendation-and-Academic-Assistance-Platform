-- ═════════════════════════════════════════════════════════════════════
-- Personalized Learning System — Supabase (PostgreSQL) Schema
-- Run this in the Supabase SQL Editor to initialize the database.
-- ═════════════════════════════════════════════════════════════════════

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin      BOOLEAN DEFAULT FALSE,
    skill_level   VARCHAR(20) DEFAULT 'beginner',
    interests     TEXT[],
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Course Enrollments Table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_id           VARCHAR(255),
    course_title        VARCHAR(255),
    enrolled_at         TIMESTAMPTZ DEFAULT NOW(),
    progress_percentage INTEGER DEFAULT 0,
    completed           BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, course_id)
);

-- 3. Study Materials Table
CREATE TABLE IF NOT EXISTS study_materials (
    id           BIGSERIAL PRIMARY KEY,
    course_title TEXT NOT NULL,
    title        TEXT NOT NULL,
    type         TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'ppt', 'link')),
    url          TEXT NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Course Progress Table
CREATE TABLE IF NOT EXISTS course_progress (
    id                       BIGSERIAL PRIMARY KEY,
    user_id                  BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_title             TEXT NOT NULL,
    progress_percentage      INT DEFAULT 0,
    completed                BOOLEAN DEFAULT FALSE,
    video_progress_component INT DEFAULT 0,
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, course_title)
);

-- 5. Video Progress Table
CREATE TABLE IF NOT EXISTS video_progress (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_title        TEXT NOT NULL,
    video_id            TEXT NOT NULL,
    completed           BOOLEAN DEFAULT FALSE,
    watched_percentage  NUMERIC DEFAULT 0,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, course_title, video_id)
);

-- 6. Quiz/Assessment Results Table
CREATE TABLE IF NOT EXISTS quiz_results (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_title  TEXT NOT NULL,
    score         INT NOT NULL,
    passed        BOOLEAN NOT NULL,
    source        TEXT,
    step_index    INT,
    taken_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    course_title TEXT NOT NULL,
    rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Learning Paths Table
CREATE TABLE IF NOT EXISTS learning_paths (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
    topic      TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    path_data  JSONB,
    UNIQUE (user_id, topic)
);

-- 9. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    course_id       VARCHAR(255),
    course_name     VARCHAR(255),
    course_title    VARCHAR(255),
    certificate_id  VARCHAR(255) UNIQUE,
    certificate_url TEXT,
    student_name    VARCHAR(255),
    completion_date VARCHAR(255),
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- 10. Search History Table (optional support)
CREATE TABLE IF NOT EXISTS search_history (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
    query       TEXT NOT NULL,
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. User Activity Table
CREATE TABLE IF NOT EXISTS user_activity (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    course_id     VARCHAR(255),
    metadata      JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for performance ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_course  ON study_materials(course_title);
CREATE INDEX IF NOT EXISTS idx_course_progress_user     ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user      ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user        ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user            ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user      ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user        ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user        ON user_activity(user_id);
