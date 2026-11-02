"""
routes/enrollment.py
─────────────────────────────────────────────────────────────────────────
Course enrollment system with skill-based recommendations
"""

from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from models import CourseEnrollment, EnrollmentResponse, UserProfileUpdate, UserProfileResponse, SkillBasedRecommendation
from datetime import datetime

router = APIRouter(prefix="/enrollment", tags=["Enrollment"])


@router.post("/enroll")
def enroll_course(data: CourseEnrollment):
    """Enroll a user in a course and generate personalized learning path"""
    try:
        # Check if already enrolled
        existing = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", data.user_id)
            .eq("course_id", data.course_id)
            .execute()
        )
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")
        
        # Create enrollment
        response = (
            supabase.table("course_enrollments")
            .insert({
                "user_id": data.user_id,
                "course_id": data.course_id,
                "course_title": data.course_title,
                "enrolled_at": datetime.utcnow().isoformat(),
                "progress_percentage": 0,
                "completed": False
            })
            .execute()
        )
        
        enrollment = response.data[0]
        
        # Initialize course_progress row so it shows up in progress tracking
        try:
            supabase.table("course_progress").insert({
                "user_id": data.user_id,
                "course_title": data.course_title,
                "progress_percentage": 0,
                "completed": False
            }).execute()
        except Exception as prog_err:
            print(f"Error initializing course progress: {prog_err}")
        
        # Log activity
        supabase.table("user_activity").insert({
            "user_id": data.user_id,
            "activity_type": "enrollment",
            "course_id": data.course_id,
            "metadata": {"course_title": data.course_title}
        }).execute()
        
        # Generate personalized learning path
        generate_personalized_path(data.user_id, data.course_title, data.skill_level)
        
        return {
            "message": "Successfully enrolled in course",
            "enrollment": EnrollmentResponse(
                enrollment_id=enrollment["id"],
                user_id=enrollment["user_id"],
                course_id=enrollment["course_id"],
                course_title=enrollment["course_title"],
                enrolled_at=enrollment["enrolled_at"],
                progress_percentage=enrollment["progress_percentage"],
                completed=enrollment["completed"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-courses/{user_id}")
def get_my_courses(user_id: int):
    """Get all enrolled courses for a user"""
    try:
        response = (
            supabase.table("course_enrollments")
            .select("*")
            .eq("user_id", user_id)
            .order("enrolled_at", desc=True)
            .execute()
        )
        
        enrollments = response.data or []
        return {
            "enrollments": enrollments,
            "total_enrolled": len(enrollments),
            "in_progress": len([e for e in enrollments if not e["completed"]]),
            "completed": len([e for e in enrollments if e["completed"]])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/unenroll/{user_id}/{course_id}")
def unenroll_course(user_id: int, course_id: str):
    """Remove a user from a course"""
    try:
        response = (
            supabase.table("course_enrollments")
            .delete()
            .eq("user_id", user_id)
            .eq("course_id", course_id)
            .execute()
        )
        
        return {"message": "Successfully unenrolled from course"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile")
def update_user_profile(data: UserProfileUpdate):
    """Update user skill level and interests"""
    try:
        update_data = {}
        if data.skill_level:
            update_data["skill_level"] = data.skill_level
        if data.interests is not None:
            update_data["interests"] = data.interests
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = (
            supabase.table("users")
            .update(update_data)
            .eq("id", data.user_id)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{user_id}")
def get_user_profile(user_id: int):
    """Get user profile with skill level and interests"""
    try:
        response = (
            supabase.table("users")
            .select("*")
            .eq("id", user_id)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = response.data[0]
        
        return UserProfileResponse(
            user_id=user["id"],
            name=user["name"],
            email=user["email"],
            skill_level=user.get("skill_level", "beginner"),
            interests=user.get("interests", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations/skill-based")
def get_skill_based_recommendations(data: SkillBasedRecommendation):
    """Get personalized course recommendations based on skill level and interests"""
    try:
        # Get user's completed courses
        completed_resp = (
            supabase.table("course_enrollments")
            .select("course_id, course_title")
            .eq("user_id", data.user_id)
            .eq("completed", True)
            .execute()
        )
        completed_courses = [c["course_title"] for c in (completed_resp.data or [])]
        
        # Get all available courses (this would typically come from a courses table)
        # For now, we'll return skill-based recommendations
        recommendations = generate_skill_recommendations(
            data.skill_level,
            data.interests,
            completed_courses
        )
        
        return {
            "skill_level": data.skill_level,
            "interests": data.interests,
            "recommendations": recommendations,
            "completed_courses": completed_courses
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_personalized_path(user_id: int, course_title: str, selected_skill_level: str = None):
    """Generate a personalized learning path for the enrolled course"""
    try:
        if selected_skill_level:
            skill_level = selected_skill_level
        else:
            user_resp = supabase.table("users").select("skill_level").eq("id", user_id).execute()
            skill_level = user_resp.data[0].get("skill_level", "beginner") if user_resp.data else "beginner"
        
        skill_level = skill_level.lower().strip()

        # Update user's profile skill level in the database to keep them in sync
        try:
            supabase.table("users").update({"skill_level": skill_level}).eq("id", user_id).execute()
        except Exception:
            pass

        # Generate path based on skill level
        path_data = generate_path_by_skill(skill_level, course_title)
        
        # Store the learning path
        supabase.table("learning_paths").upsert({
            "user_id": user_id,
            "topic": course_title,
            "path_data": path_data
        }).execute()
        
    except Exception as e:
        print(f"Error generating personalized path: {e}")


def generate_path_by_skill(skill_level: str, course_title: str):
    """Generate learning path based on skill level"""
    paths = {
        "beginner": [
            {"step": 1, "title": f"Introduction to {course_title}", "desc": f"Watch introductory video tutorial covering core principles of {course_title}.", "duration": "2 hours", "type": "video"},
            {"step": 2, "title": f"Basic Concepts of {course_title}", "desc": f"Read fundamental concepts, terms, and syntax for {course_title}.", "duration": "3 hours", "type": "reading"},
            {"step": 3, "title": f"Hands-on Practice: {course_title} Basics", "desc": f"Practice basic coding blocks and exercises to build confidence.", "duration": "4 hours", "type": "practice"},
            {"step": 4, "title": f"Beginner Quiz: {course_title}", "desc": f"Test your foundational knowledge with a beginner quiz.", "duration": "30 mins", "type": "quiz"}
        ],
        "intermediate": [
            {"step": 1, "title": f"{course_title} Fundamentals Review", "desc": f"Review basic topics and speed up with intermediate tools.", "duration": "1 hour", "type": "video"},
            {"step": 2, "title": f"Advanced {course_title} Concepts", "desc": f"Deep dive into complex features and APIs of {course_title}.", "duration": "4 hours", "type": "video"},
            {"step": 3, "title": f"Mini Project: {course_title} Application", "desc": f"Build a practical real-world mini application.", "duration": "8 hours", "type": "project"},
            {"step": 4, "title": f"Intermediate Assessment", "desc": f"Complete the intermediate assessment milestone.", "duration": "45 mins", "type": "quiz"}
        ],
        "advanced": [
            {"step": 1, "title": f"Advanced {course_title} Architecture", "desc": f"Master core architecture, performance, and scaling.", "duration": "3 hours", "type": "video"},
            {"step": 2, "title": f"Research Papers on {course_title}", "desc": f"Read scientific and industry case studies for advanced setups.", "duration": "5 hours", "type": "reading"},
            {"step": 3, "title": f"Capstone Project: {course_title} System", "desc": f"Create a comprehensive capstone project showcasing deep knowledge.", "duration": "20 hours", "type": "project"},
            {"step": 4, "title": f"Industry Case Studies", "desc": f"Analyze real-world designs and enterprise integrations.", "duration": "4 hours", "type": "case_study"},
            {"step": 5, "title": f"Advanced Certification", "desc": f"Earn your advanced certification by passing the master exam.", "duration": "1 hour", "type": "quiz"}
        ]
    }
    
    return paths.get(skill_level, paths["beginner"])


def generate_skill_recommendations(skill_level: str, interests: list, completed_courses: list):
    """Generate course recommendations based on skill level and interests"""
    # This would typically query a courses database
    # For now, return mock recommendations based on skill level
    
    skill_courses = {
        "beginner": [
            {"id": "b1", "title": "Python Fundamentals", "level": "beginner", "category": "Programming"},
            {"id": "b2", "title": "Web Development Basics", "level": "beginner", "category": "Web"},
            {"id": "b3", "title": "Data Science Introduction", "level": "beginner", "category": "Data"}
        ],
        "intermediate": [
            {"id": "i1", "title": "Advanced Python Programming", "level": "intermediate", "category": "Programming"},
            {"id": "i2", "title": "React Framework Deep Dive", "level": "intermediate", "category": "Web"},
            {"id": "i3", "title": "Machine Learning with Python", "level": "intermediate", "category": "Data"}
        ],
        "advanced": [
            {"id": "a1", "title": "System Design Patterns", "level": "advanced", "category": "Programming"},
            {"id": "a2", "title": "Microservices Architecture", "level": "advanced", "category": "Web"},
            {"id": "a3", "title": "Deep Learning Specialization", "level": "advanced", "category": "Data"}
        ]
    }
    
    courses = skill_courses.get(skill_level, skill_courses["beginner"])
    
    # Filter by interests if provided
    if interests:
        filtered_courses = [c for c in courses if any(interest.lower() in c["category"].lower() or c["category"].lower() in interest.lower() for interest in interests)]
        if filtered_courses:
            courses = filtered_courses
    
    # Remove completed courses
    if completed_courses:
        courses = [c for c in courses if c["title"] not in completed_courses]
    
    return courses
@router.get("/all")
def get_all_enrollments():
    try:
        response = (
            supabase.table("course_enrollments")
            .select("*")
            .execute()
        )

        return response.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))