-- ═════════════════════════════════════════════════════════════════════
-- Database Migration Patch: Run this in the Supabase SQL Editor
-- ═════════════════════════════════════════════════════════════════════

-- 1. Create User Activity Table (if it does not exist)
CREATE TABLE IF NOT EXISTS user_activity (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    course_id     VARCHAR(255),
    metadata      JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add video progress tracking support to Course Progress table
ALTER TABLE course_progress ADD COLUMN IF NOT EXISTS video_progress_component INT DEFAULT 0;

-- 3. Add dynamic grading metadata columns to Quiz Results table
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS step_index INT;

-- 4. Add dynamic certificate payload columns to Certificates table
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_title VARCHAR(255);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS completion_date VARCHAR(255);

-- 5. Add index on User Activity for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
