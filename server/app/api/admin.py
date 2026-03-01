from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, cast
from app.core.database import db
from app.core.auth import get_current_user
import datetime

router = APIRouter()

@router.get("/dashboard")
async def get_admin_dashboard(user_id: str = Depends(get_current_user)):
    """
    V3.0 God Mode: Fetches aggregated metrics and the waitlist for the Admin Console.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database Offline")

    try:
        # 1. Fetch the pre-calculated metrics from our SQL View
        metrics_res = db.table("admin_global_metrics").select("*").execute()
        metrics = metrics_res.data[0] if metrics_res.data else {
            "total_audits": 0, "active_leads": 0, "avg_latency": 0.0, 
            "avg_trust_score": 0.0, "total_breaches": 0
        }

        # 2. Fetch the latest 10 Waitlist Leads
        leads_res = db.table("waitlist_leads").select("*").order("created_at", desc=True).limit(10).execute()
        leads = cast(List[Dict[str, Any]], leads_res.data)

        # 3. Format the dates for the UI
        for lead in leads:
            # Simple fallback formatting for created_at
            created_at = lead.get("created_at")
            if created_at:
                lead["date"] = str(created_at).split("T")[0]
            else:
                lead["date"] = "Recent"

        return {
            "metrics": metrics,
            "leads": leads
        }

    except Exception as e:
        print(f"❌ ADMIN API ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch admin telemetry")
