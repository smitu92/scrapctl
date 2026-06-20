from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import Optional
from pydantic import BaseModel

from shared.database import get_session
from shared.models import UserFeedback

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

class FeedbackSubmitRequest(BaseModel):
    email: Optional[str] = None
    focus_on_url_scraping: bool
    open_source_project: bool
    profession: Optional[str] = None
    why_love: Optional[str] = None
    usecase: Optional[str] = None
    message: Optional[str] = None

@router.post("")
async def submit_feedback(req: FeedbackSubmitRequest, session: Session = Depends(get_session)):
    try:
        # Validate email if provided
        if req.email and ("@" not in req.email or "." not in req.email):
            raise HTTPException(status_code=400, detail="Invalid email format.")

        feedback_entry = UserFeedback(
            email=req.email,
            focus_on_url_scraping=req.focus_on_url_scraping,
            open_source_project=req.open_source_project,
            profession=req.profession,
            why_love=req.why_love,
            usecase=req.usecase,
            message=req.message
        )
        session.add(feedback_entry)
        session.commit()
        session.refresh(feedback_entry)
        return {"status": "SUCCESS", "id": feedback_entry.id}

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database submission failed: {e}")

@router.get("")
async def get_all_feedback(session: Session = Depends(get_session)):
    """Retrieve all feedbacks ordered by newest first"""
    try:
        stmt = select(UserFeedback).order_by(UserFeedback.created_at.desc())
        results = session.exec(stmt).all()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval failed: {e}")
