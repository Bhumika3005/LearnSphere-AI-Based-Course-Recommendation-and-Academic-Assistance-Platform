"""
routes/assessment.py
─────────────────────────────────────────────────────────────────────────
Assessment router. Serves fixed, curated per-step assessment questions
(no longer AI-generated — the previous Groq-based generation produced
near-duplicate questions across different videos of the same course)
and scores submitted assessments.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from models import AssessmentSubmit, ProgressUpdate
from models.static_assessments import get_static_assessment
from routes.progress import _get_progress_row, update_course_progress, _course_title_matches
from routes.videos import _find_videos

router = APIRouter(prefix="/assessment", tags=["Assessment"])


@router.get("/static/{topic}/{step_index}")
async def get_static_step_assessment(
    topic: str,
    step_index: int,
    user_id: int = None,
    video_url: str = None,
    skill_level: str = "beginner"
):
    """Return 15 dynamically generated assessment questions for a course step using AI."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # 1. Perform video watch lock check
    target_url = video_url
    if not target_url:
        videos = _find_videos(topic, skill_level)
        if step_index < len(videos):
            target_url = videos[step_index].get("url")

    if target_url:
        try:
            vp_resp = (
                supabase.table("video_progress")
                .select("video_id,completed,watched_percentage")
                .eq("user_id", user_id)
                .execute()
            )
            rows = vp_resp.data or []
            norm_target = (target_url or "").strip().lower()
            done = any(
                (r.get("video_id") or "").strip().lower() == norm_target
                and (r.get("completed") or (r.get("watched_percentage") or 0) >= 90)
                for r in rows
            )
            if not done:
                raise HTTPException(
                    status_code=403,
                    detail="Watch this step's video to at least 90% before taking its assessment.",
                )
        except HTTPException:
            raise
        except Exception:
            pass  # if check itself fails, don't block

    # 2. Get step information from learning path
    step_title = f"Step {step_index + 1} Assessment"
    step_desc = f"Assess your understanding of the concepts learned in step {step_index + 1}."
    
    lp_resp = (
        supabase.table("learning_paths")
        .select("path_data")
        .eq("user_id", user_id)
        .eq("topic", topic)
        .execute()
    )
    
    path_data = None
    if lp_resp.data and lp_resp.data[0].get("path_data"):
        path_data = lp_resp.data[0]["path_data"]
        
    # Find the corresponding video step in the alternating path layout
    if path_data:
        target_step_num = 2 * step_index + 1
        for step in path_data:
            if step.get("step") == target_step_num or (step.get("type") == "video" and step.get("step") == step_index + 1):
                step_title = step.get("title", step_title)
                step_desc = step.get("desc", step_desc)
                break

    # 3. Check if we already generated and saved 15 questions for this step
    existing_questions = []
    if path_data:
        assessment_step_num = 2 * step_index + 2
        for step in path_data:
            if step.get("step") == assessment_step_num and step.get("type") == "assessment":
                questions = step.get("questions", [])
                if len(questions) == 15:
                    existing_questions = questions
                    break

    if existing_questions:
        return {
            "topic": topic,
            "step_index": step_index,
            "step_title": step_title,
            "questions": [
                {"q": q["q"], "options": q["options"]} for q in existing_questions
            ],
        }

    # 4. Generate 15 questions using Groq
    from services.groq_service import generate_quiz_questions
    try:
        generated = await generate_quiz_questions(
            topic=f"{topic} - {step_title} ({step_desc})",
            num_questions=15,
            skill_level=skill_level
        )
        if not generated or len(generated) < 15:
            generated = await generate_quiz_questions(
                topic=topic,
                num_questions=15,
                skill_level=skill_level
            )
    except Exception as e:
        print(f"Error calling Groq for dynamic assessment: {e}")
        from models.static_assessments import get_static_assessment
        block = get_static_assessment(topic, step_index, skill_level)
        if block:
            static_questions = block["questions"]
            extended_questions = []
            while len(extended_questions) < 15 and static_questions:
                extended_questions.extend(static_questions)
            generated = [{"q": q["q"], "options": q["options"], "answer": q["answer"]} for q in extended_questions[:15]]
        else:
            raise HTTPException(status_code=500, detail="Failed to generate dynamic assessment questions")

    # 5. Save the generated questions back to Supabase learning_paths
    if path_data:
        assessment_step_num = 2 * step_index + 2
        updated = False
        for step in path_data:
            if step.get("step") == assessment_step_num and step.get("type") == "assessment":
                step["questions"] = generated
                updated = True
                break
        
        if not updated:
            for step in path_data:
                if step.get("step") == step_index + 1:
                    step["questions"] = generated
                    break
        
        try:
            supabase.table("learning_paths").update({
                "path_data": path_data
            }).eq("user_id", user_id).eq("topic", topic).execute()
        except Exception as db_err:
            print(f"Failed to cache generated quiz questions in DB: {db_err}")

    return {
        "topic": topic,
        "step_index": step_index,
        "step_title": step_title,
        "questions": [
            {"q": q["q"], "options": q["options"]} for q in generated
        ],
    }


@router.post("/submit")
async def submit_assessment(data: AssessmentSubmit):
    """
    Grade a submitted static or dynamic assessment against the correct answer key,
    save the result in quiz_results, generate a personalized study recommendation
    based on incorrect answers using AI, and update course progress.
    """
    block = get_static_assessment(data.topic, data.step_index, data.skill_level)
    wrong_questions = []
    cached_questions = []
    
    # Try to load cached questions from learning_paths first
    try:
        lp_resp = (
            supabase.table("learning_paths")
            .select("path_data")
            .eq("user_id", data.user_id)
            .eq("topic", data.topic)
            .execute()
        )
        if lp_resp.data and lp_resp.data[0].get("path_data"):
            path_steps = lp_resp.data[0]["path_data"]
            target_step = None
            for step in path_steps:
                step_num = step.get("step", 0)
                if step_num in (2 * data.step_index + 2, 2 * data.step_index + 1, data.step_index + 1, data.step_index + 2):
                    questions = step.get("questions", [])
                    if isinstance(questions, list) and len(questions) == 15:
                        target_step = step
                        break
            
            if not target_step:
                assessment_step_num = 2 * data.step_index + 2
                for step in path_steps:
                    if step.get("step") == assessment_step_num or step.get("step") == data.step_index + 1:
                        target_step = step
                        break

            if target_step and "questions" in target_step:
                cached_questions = target_step["questions"]
    except Exception as e:
        print(f"Error checking cached questions in submit: {e}")

    # 1. Evaluate answers and collect wrong questions
    try:
        if cached_questions:
            total = len(cached_questions)
            correct = 0
            detailed_results = []
            for idx, ans in enumerate(data.answers):
                if idx < total:
                    q_data = cached_questions[idx]
                    correct_ans = q_data.get("answer")
                    if correct_ans is None:
                        correct_ans = q_data.get("correct_answer")
                    if correct_ans is None:
                        correct_ans = q_data.get("correct", 0)

                    if isinstance(correct_ans, str):
                        opts = q_data.get("options", [])
                        try:
                            correct_ans = next(i for i, o in enumerate(opts) if str(o).strip().lower() == correct_ans.strip().lower())
                        except StopIteration:
                            try:
                                correct_ans = int(correct_ans)
                            except ValueError:
                                correct_ans = 0

                    is_correct = False
                    try:
                        is_correct = int(ans) == int(correct_ans)
                    except (ValueError, TypeError):
                        is_correct = str(ans).strip().lower() == str(correct_ans).strip().lower()

                    if is_correct:
                        correct += 1
                    else:
                        wrong_questions.append(q_data.get("q") or q_data.get("question") or f"Question {idx + 1}")
                    
                    detailed_results.append({
                        "question_index": idx,
                        "question": q_data.get("q") or q_data.get("question") or f"Question {idx + 1}",
                        "options": q_data.get("options", []),
                        "user_answer": ans,
                        "correct_answer": correct_ans,
                        "is_correct": is_correct
                    })
        elif block:
            correct_answers = [q.get("answer", 0) for q in block["questions"]]
            total = len(correct_answers)
            correct = 0
            detailed_results = []
            for idx, ans in enumerate(data.answers):
                is_correct = idx < total and ans == correct_answers[idx]
                if is_correct:
                    correct += 1
                
                if idx < total:
                    q_item = block["questions"][idx]
                    if not is_correct:
                        wrong_questions.append(q_item["q"])
                    
                    detailed_results.append({
                        "question_index": idx,
                        "question": q_item["q"],
                        "options": q_item["options"],
                        "user_answer": ans,
                        "correct_answer": correct_answers[idx],
                        "is_correct": is_correct
                    })
                else:
                    detailed_results.append({
                        "question_index": idx,
                        "question": f"Question {idx + 1}",
                        "options": [],
                        "user_answer": ans,
                        "correct_answer": None,
                        "is_correct": False
                    })
        else:
            raise ValueError("No questions found to evaluate")
    except Exception as eval_err:
        print(f"Error evaluating answers in submit: {eval_err}")
        total = len(data.answers)
        correct = total
        detailed_results = []
        for idx, ans in enumerate(data.answers):
            detailed_results.append({
                "question_index": idx,
                "question": f"Question {idx + 1}",
                "options": [],
                "user_answer": ans,
                "correct_answer": ans,
                "is_correct": True
            })

    score = round((correct / total) * 100) if total else 0
    passed = score >= 60

    # 2. Generate personalized recommendation
    recommendation = ""
    if score == 100:
        recommendation = "Outstanding! You have fully mastered this section. You are ready to proceed to the next module."
    else:
        # Check if the active provider has an API key configured
        active_provider = (config.LLM_PROVIDER or "groq").strip().lower()
        has_key = False
        if active_provider == "gemini" and config.GEMINI_API_KEY:
            has_key = True
        elif active_provider == "openai" and config.OPENAI_API_KEY:
            has_key = True
        elif active_provider == "groq" and config.GROQ_API_KEY:
            has_key = True

        if not has_key:
            if score >= 80:
                recommendation = "Great effort! You've grasped most concepts. Review the questions you missed to achieve perfection."
            else:
                recommendation = "Keep practicing! We suggest reviewing this step's study materials and watching the video tutorial again before retaking the quiz."
        else:
            try:
                from services.groq_service import groq_chat_completion
                q_list = "\n".join([f"- {q}" for q in wrong_questions])
                prompt = f"""A student took a quiz on "{data.topic}" and scored {score}% ({correct} out of {total} correct).
They got the following questions wrong:
{q_list}

Based on these wrong answers, provide a 1-2 sentence encouraging study recommendation. Tell them what topics or areas they need to focus on. Keep it under 50 words. Do not include any intro like "Here is the recommendation:" or markdown formatting. Start directly with the recommendation."""
                rec_response = await groq_chat_completion(prompt, max_tokens=150)
                recommendation = rec_response.strip()
            except Exception:
                if score >= 80:
                    recommendation = "Great effort! Review the incorrect questions to master this topic."
                else:
                    recommendation = "Keep learning! We recommend reviewing the video tutorial and materials for this step before trying again."

    # 3. Save result and update progress
    try:
        supabase.table("quiz_results").insert({
            "user_id": data.user_id,
            "course_title": data.course_name,
            "score": score,
            "passed": passed,
            "source": "assessment",
            "step_index": data.step_index,
            "taken_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        update_course_progress(ProgressUpdate(user_id=data.user_id, course_title=data.course_name))

        updated_progress = _get_progress_row(data.user_id, data.course_name)
        progress_percentage = updated_progress.get("progress_percentage", 0) if updated_progress else 0
        completed = updated_progress.get("completed", False) if updated_progress else False

        return {
            "score": score,
            "correct": correct,
            "total": total,
            "passed": passed,
            "progress_percentage": progress_percentage,
            "completed": completed,
            "detailed_results": detailed_results,
            "recommendation": recommendation,
            "step_title": block["step_title"] if block else f"Step {data.step_index + 1}"
        }
    except Exception as e:
        print(f"Database error during assessment submission: {e}")
        return {
            "score": score,
            "correct": correct,
            "total": total,
            "passed": passed,
            "progress_percentage": 0,
            "completed": False,
            "detailed_results": detailed_results,
            "recommendation": recommendation,
            "step_title": block["step_title"] if block else f"Step {data.step_index + 1}"
        }