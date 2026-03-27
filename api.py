import hashlib
import hmac
import io
import secrets
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn

# Import existing application logic
from config.database import (
    add_admin,
    get_database_connection,
    init_database,
    save_ai_analysis_data,
    save_analysis_data,
    save_resume_data,
    verify_admin,
)
from config.job_roles import JOB_ROLES
from jobs.job_portals import JobPortal
from jobs.suggestions import (
    EXPERIENCE_RANGES,
    JOB_SUGGESTIONS,
    JOB_TYPES,
    LOCATION_SUGGESTIONS,
    SALARY_RANGES,
)
from utils.resume_analyzer import ResumeAnalyzer
from utils.ai_resume_analyzer import AIResumeAnalyzer
from utils.resume_builder import ResumeBuilder


app = FastAPI(title="Resume Analyzer API")

# Configure CORS for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = ResumeAnalyzer()
ai_analyzer = AIResumeAnalyzer()
builder = ResumeBuilder()
job_portal = JobPortal()

SESSION_DURATION_HOURS = 24
REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"
WEEKDAY_API_URL = "https://api.weekday.technology/adhoc/getSampleJdJSON"
THEMUSE_API_URL = "https://www.themuse.com/api/public/jobs"
INDIA_LOCATION_TERMS = {
    "india",
    "bangalore",
    "bengaluru",
    "mumbai",
    "pune",
    "hyderabad",
    "chennai",
    "delhi",
    "noida",
    "gurgaon",
    "gurugram",
    "kolkata",
    "ahmedabad",
}


class AuthRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = ""


class AuthLoginRequest(BaseModel):
    email: str
    password: str


class AIAnalysisRequest(BaseModel):
    resume_text: str
    target_role: str = ""
    target_category: str = ""
    model: str = "Google Gemini"


class JobSearchRequest(BaseModel):
    job_title: str
    location: str = ""
    experience_id: str = "all"


class SuggestionsQuery(BaseModel):
    query: str = ""
    location_query: str = ""


def _dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _hash_password(password: str, salt: str) -> str:
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return hashed.hex()


def _create_auth_tables() -> None:
    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()
    
    # Initialize default admin if not exists
    try:
        if not verify_admin("user@example.com", "password"):
            add_admin("user@example.com", "password")
    except Exception:
        pass


def _get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (_normalize_email(email),))
    user = cursor.fetchone()
    conn.close()
    return user


def _create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)

    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO auth_sessions (user_id, token_hash, expires_at, is_active)
        VALUES (?, ?, ?, 1)
        """,
        (user_id, token_hash, expires_at.isoformat()),
    )
    conn.commit()
    conn.close()
    return token


def _parse_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()


def _get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.email, u.full_name, s.id as session_id, s.expires_at, s.is_active
        FROM auth_sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
        ORDER BY s.created_at DESC
        LIMIT 1
        """,
        (token_hash,),
    )
    record = cursor.fetchone()
    conn.close()

    if not record:
        return None

    if not record.get("is_active"):
        return None

    try:
        expires_at = datetime.fromisoformat(record["expires_at"])
    except Exception:
        return None

    if datetime.utcnow() > expires_at:
        return None

    return record


def _require_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    token = _parse_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token")

    user = _get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    return user


def _create_admin_session(admin_email: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)

    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO admin_sessions (admin_email, token_hash, expires_at, is_active)
        VALUES (?, ?, ?, 1)
        """,
        (admin_email, token_hash, expires_at.isoformat()),
    )
    conn.commit()
    conn.close()
    return token


def _get_admin_from_token(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT admin_email, expires_at, is_active
        FROM admin_sessions
        WHERE token_hash = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (token_hash,),
    )
    record = cursor.fetchone()
    conn.close()

    if not record:
        return None

    if not record.get("is_active"):
        return None

    try:
        expires_at = datetime.fromisoformat(record["expires_at"])
    except Exception:
        return None

    if datetime.utcnow() > expires_at:
        return None

    return {"email": record["admin_email"]}


def _require_admin(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    token = _parse_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Admin authorization required")

    admin = _get_admin_from_token(token)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin session")

    return admin


def _create_admin_session(admin_email: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)

    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO admin_sessions (admin_email, token_hash, expires_at, is_active)
        VALUES (?, ?, ?, 1)
        """,
        (admin_email, token_hash, expires_at.isoformat()),
    )
    conn.commit()
    conn.close()
    return token


def _get_admin_from_token(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT admin_email, expires_at, is_active
        FROM admin_sessions
        WHERE token_hash = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (token_hash,),
    )
    record = cursor.fetchone()
    conn.close()

    if not record:
        return None

    if not record.get("is_active"):
        return None

    try:
        expires_at = datetime.fromisoformat(record["expires_at"])
    except Exception:
        return None

    if datetime.utcnow() > expires_at:
        return None

    return {"email": record["admin_email"]}


def _require_admin(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    token = _parse_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Admin authorization required")

    admin = _get_admin_from_token(token)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin session")

    return admin


def _find_role_info(category: str, role: str) -> Dict[str, Any]:
    if category in JOB_ROLES and role in JOB_ROLES[category]:
        return JOB_ROLES[category][role]

    # Fallback: search role across all categories.
    for _, roles in JOB_ROLES.items():
        if role in roles:
            return roles[role]

    return {"required_skills": [], "description": "", "sections": []}


def _fetch_real_jobs(job_title: str, location: str = "", limit: int = 10) -> List[Dict[str, Any]]:
    """Fetch real job listings from free APIs with company names and direct links."""
    normalized_query = (job_title or "").strip().lower()
    query_tokens = [token for token in normalized_query.split() if token]
    normalized_location = (location or "").strip().lower()
    is_india_search = normalized_location in INDIA_LOCATION_TERMS or "india" in normalized_location

    def _matches_location(location_text: str) -> bool:
        if not normalized_location:
            return True

        text = (location_text or "").lower()
        if normalized_location in text:
            return True

        if is_india_search:
            if any(term in text for term in INDIA_LOCATION_TERMS):
                return True
            if any(term in text for term in ("remote", "anywhere", "worldwide", "flexible")):
                return True

        return False

    all_jobs: List[Dict[str, Any]] = []

    # Source 1: Weekday API (large India-focused dataset).
    try:
        response = requests.post(
            WEEKDAY_API_URL,
            json={"limit": 80, "offset": 0},
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jdList", [])

        for job in jobs:
            title = (job.get("jobRole") or "").strip()
            title_lower = title.lower()
            company = (job.get("companyName") or "").strip() or "Unknown"
            location_text = (job.get("location") or "India").strip()

            if query_tokens and not any(token in title_lower for token in query_tokens):
                continue

            if not _matches_location(location_text):
                continue

            min_salary = job.get("minJdSalary")
            max_salary = job.get("maxJdSalary")
            salary = ""
            if min_salary or max_salary:
                salary = f"{min_salary or '?'} - {max_salary or '?'} LPA"

            all_jobs.append(
                {
                    "id": job.get("jdUid") or job.get("jdLink") or f"weekday-{len(all_jobs)}",
                    "title": title,
                    "company": company,
                    "location": location_text,
                    "job_type": "Full-time",
                    "salary": salary,
                    "url": job.get("jdLink") or "",
                    "published_at": "",
                    "tags": [title, company],
                    "source": "Weekday",
                }
            )
    except Exception:
        pass

    # Source 2: Remotive API.
    try:
        response = requests.get(
            REMOTIVE_API_URL,
            params={"search": job_title},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs", [])

        for job in jobs:
            title = (job.get("title") or "").strip()
            title_lower = title.lower()
            if query_tokens and not any(token in title_lower for token in query_tokens):
                continue

            candidate_location = (job.get("candidate_required_location") or "Anywhere").strip()
            if not _matches_location(candidate_location):
                continue
            all_jobs.append(
                {
                    "id": job.get("id"),
                    "title": title,
                    "company": job.get("company_name", ""),
                    "location": candidate_location,
                    "job_type": job.get("job_type", ""),
                    "salary": job.get("salary", ""),
                    "url": job.get("url", ""),
                    "published_at": job.get("publication_date", ""),
                    "tags": job.get("tags", []),
                    "source": "Remotive",
                }
            )
    except Exception:
        pass

    # Source 3: Arbeitnow API (no API key required).
    try:
        response = requests.get(ARBEITNOW_API_URL, timeout=12)
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("data", [])

        for job in jobs:
            title = (job.get("title") or "").strip()
            title_lower = title.lower()
            tags_text = " ".join(job.get("tags") or []).lower()
            if query_tokens and not any(token in title_lower or token in tags_text for token in query_tokens):
                continue

            company = (job.get("company_name") or "").strip() or "Unknown"
            location_text = (job.get("location") or "Remote").strip()
            if not _matches_location(location_text):
                continue
            tags = job.get("tags") or []
            all_jobs.append(
                {
                    "id": job.get("slug") or job.get("id"),
                    "title": title,
                    "company": company,
                    "location": location_text,
                    "job_type": (job.get("job_types") or [""])[0] if isinstance(job.get("job_types"), list) else "",
                    "salary": "",
                    "url": job.get("url", ""),
                    "published_at": job.get("created_at", ""),
                    "tags": tags if isinstance(tags, list) else [],
                    "source": "Arbeitnow",
                }
            )
    except Exception:
        pass

    # Source 4: The Muse public jobs API.
    try:
        for page in (1, 2, 3):
            muse_params: Dict[str, Any] = {"page": page}
            if is_india_search:
                muse_params["location"] = "India"

            response = requests.get(
                THEMUSE_API_URL,
                params=muse_params,
                timeout=12,
            )
            response.raise_for_status()
            payload = response.json()
            jobs = payload.get("results", [])

            for job in jobs:
                title = (job.get("name") or "").strip()
                title_lower = title.lower()
                if query_tokens and not any(token in title_lower for token in query_tokens):
                    continue

                company = ((job.get("company") or {}).get("name") or "Unknown").strip()
                locations = job.get("locations") or []
                location_names = [loc.get("name", "") for loc in locations if isinstance(loc, dict)]
                location_text = ", ".join([l for l in location_names if l]) or "Remote"

                if not _matches_location(location_text):
                    continue

                if is_india_search:
                    ltxt = location_text.lower()
                    if not (
                        any(term in ltxt for term in INDIA_LOCATION_TERMS)
                        or "remote" in ltxt
                        or "flexible" in ltxt
                    ):
                        continue

                refs = job.get("refs") or {}
                apply_url = refs.get("landing_page") or refs.get("apply") or ""
                all_jobs.append(
                    {
                        "id": job.get("id") or f"muse-{len(all_jobs)}",
                        "title": title,
                        "company": company,
                        "location": location_text,
                        "job_type": "Full-time",
                        "salary": "",
                        "url": apply_url,
                        "published_at": job.get("publication_date", ""),
                        "tags": [title, company],
                        "source": "The Muse",
                    }
                )
    except Exception:
        pass

    # Rank jobs by location relevance when a location was provided.
    if normalized_location:
        all_jobs.sort(
            key=lambda j: (
                0 if normalized_location in (j.get("location") or "").lower() else 1,
                0 if j.get("source") in ("Weekday", "The Muse") else 1,
            )
        )

    # Deduplicate by URL or title+company.
    deduped: List[Dict[str, Any]] = []
    seen = set()
    for job in all_jobs:
        dedupe_key = job.get("url") or f"{job.get('title')}::{job.get('company')}"
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        deduped.append(job)
        if len(deduped) >= limit:
            break

    return deduped


def _run_ai_analysis_with_retry(
    resume_text: str,
    target_role: str,
    role_info: Dict[str, Any],
    model: str = "Google Gemini",
) -> Dict[str, Any]:
    """Run AI analysis with a retry for resilience when provider responses are unstable."""
    result = ai_analyzer.analyze_resume(
        resume_text,
        job_role=target_role,
        role_info=role_info,
        model=model,
    )
    if result and not result.get("error") and result.get("full_response"):
        return result

    trimmed_text = (resume_text or "")[:12000]
    return ai_analyzer.analyze_resume(
        trimmed_text,
        job_role=target_role,
        role_info=role_info,
        model=model,
    )


def _portal_results_to_job_rows(
    portal_results: List[Dict[str, Any]],
    job_title: str,
    location: str,
) -> List[Dict[str, Any]]:
    """Convert portal links into job-style rows when live API results are unavailable."""
    fallback_jobs: List[Dict[str, Any]] = []
    for idx, portal in enumerate(portal_results, start=1):
        fallback_jobs.append(
            {
                "id": f"portal-{idx}",
                "title": f"{job_title} ({portal.get('portal', 'Portal')})",
                "company": portal.get("portal", "Portal"),
                "location": location or "Remote/India",
                "job_type": "Full-time",
                "salary": "",
                "url": portal.get("url", ""),
                "published_at": "",
                "tags": [job_title, portal.get("portal", "Portal")],
                "source": portal.get("portal", "Portal"),
            }
        )
    return fallback_jobs


@app.on_event("startup")
async def startup_event() -> None:
    init_database()
    _create_auth_tables()


@app.post("/api/auth/register")
async def register_user(request: AuthRegisterRequest):
    email = _normalize_email(request.email)
    password = request.password or ""

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if _get_user_by_email(email):
        raise HTTPException(status_code=409, detail="User already exists")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)

    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (email, full_name, password_salt, password_hash)
        VALUES (?, ?, ?, ?)
        """,
        (email, request.full_name or "", salt, password_hash),
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    token = _create_session(user_id)
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "full_name": request.full_name or "",
        },
    }


@app.post("/api/auth/login")
async def login_user(request: AuthLoginRequest):
    user = _get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    provided_hash = _hash_password(request.password or "", user["password_salt"])
    if not hmac.compare_digest(provided_hash, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _create_session(user["id"])
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name") or "",
        },
    }


@app.get("/api/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(_require_user)):
    return {
        "success": True,
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "full_name": current_user.get("full_name") or "",
        },
    }


@app.post("/api/auth/logout")
async def logout_user(authorization: Optional[str] = Header(default=None)):
    token = _parse_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE auth_sessions SET is_active = 0 WHERE token_hash = ?", (token_hash,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.post("/api/admin/login")
async def admin_login(request: AuthLoginRequest):
    """Admin login endpoint"""
    if not verify_admin(request.email, request.password):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    token = _create_admin_session(request.email)
    return {
        "success": True,
        "token": token,
        "admin": {"email": request.email}
    }


@app.post("/api/admin/logout")
async def admin_logout(authorization: Optional[str] = Header(default=None)):
    """Admin logout endpoint"""
    token = _parse_bearer_token(authorization)
    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        conn = get_database_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE admin_sessions SET is_active = 0 WHERE token_hash = ?", (token_hash,))
        conn.commit()
        conn.close()
    return {"success": True}


@app.get("/api/admin/me")
async def get_admin_me(admin: Dict[str, Any] = Depends(_require_admin)):
    """Get current admin info"""
    return {
        "success": True,
        "admin": admin
    }

@app.get("/api/status")
async def get_status():
    return {"status": "ok", "message": "Resume Analyzer API is running"}

@app.post("/api/upload")
async def upload_resume(
    file: UploadFile = File(...),
    target_category: str = Form(default=""),
    target_role: str = Form(default=""),
    current_user: Dict[str, Any] = Depends(_require_user),
):
    request_id = secrets.token_hex(4)
    try:
        print(f"[upload:{request_id}] start user={current_user.get('email', '')} file={file.filename} category={target_category} role={target_role}")
        content = await file.read()
        print(f"[upload:{request_id}] file read bytes={len(content)}")
        file_obj = io.BytesIO(content)
        file_obj.name = file.filename

        file_name_lc = (file.filename or "").lower()
        if file_name_lc.endswith('.pdf'):
            print(f"[upload:{request_id}] extracting pdf text")
            text = analyzer.extract_text_from_pdf(file_obj)
        elif file_name_lc.endswith(('.doc', '.docx')):
            print(f"[upload:{request_id}] extracting doc/docx text")
            text = analyzer.extract_text_from_docx(file_obj)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        print(f"[upload:{request_id}] extracted text length={len(text or '')}")

        role_info = _find_role_info(target_category, target_role)
        print(f"[upload:{request_id}] role info loaded skills={len(role_info.get('required_skills', []))}")
        analytics = analyzer.analyze_resume({"raw_text": text}, role_info)
        print(f"[upload:{request_id}] standard analysis complete error={analytics.get('error') if isinstance(analytics, dict) else 'n/a'}")
        ai_analysis = _run_ai_analysis_with_retry(
            text,
            target_role=target_role,
            role_info=role_info,
            model="Google Gemini",
        )
        print(f"[upload:{request_id}] ai analysis complete error={ai_analysis.get('error') if isinstance(ai_analysis, dict) else 'n/a'} score={ai_analysis.get('score') if isinstance(ai_analysis, dict) else 'n/a'}")
        portal_suggestions = job_portal.search_jobs(
            target_role or "Software Engineer",
            "",
            {"id": "all", "text": "all"},
        )
        suggested_jobs = _fetch_real_jobs(target_role or "Software Engineer", "india", limit=8)
        if not suggested_jobs:
            suggested_jobs = _portal_results_to_job_rows(
                portal_suggestions,
                target_role or "Software Engineer",
                "Remote/India",
            )
        print(f"[upload:{request_id}] jobs real={len(suggested_jobs)} portals={len(portal_suggestions)}")

        if ai_analysis and not ai_analysis.get("error"):
            save_ai_analysis_data(
                resume_id=0,
                analysis_data={
                    "owner_email": current_user.get("email", ""),
                    "model_used": ai_analysis.get("model_used", "Google Gemini"),
                    "resume_score": ai_analysis.get("score", 0),
                    "job_role": target_role,
                },
            )

        if "error" not in analytics and analytics.get("document_type") == "resume":
            resume_data = {
                "personal_info": {
                    "full_name": analytics.get("name", ""),
                    "email": analytics.get("email", ""),
                    "phone": analytics.get("phone", ""),
                    "linkedin": analytics.get("linkedin", ""),
                    "github": analytics.get("github", ""),
                    "portfolio": analytics.get("portfolio", ""),
                },
                "summary": analytics.get("summary", ""),
                "owner_email": current_user.get("email", ""),
                "target_role": target_role,
                "target_category": target_category,
                "education": analytics.get("education", []),
                "experience": analytics.get("experience", []),
                "projects": analytics.get("projects", []),
                "skills": analytics.get("skills", []),
                "template": "frontend-upload",
            }
            resume_id = save_resume_data(resume_data)

            if resume_id:
                analysis_data = {
                    "ats_score": analytics.get("ats_score", 0),
                    "keyword_match_score": analytics.get("keyword_match", {}).get("score", 0),
                    "format_score": analytics.get("format_score", 0),
                    "section_score": analytics.get("section_score", 0),
                    "missing_skills": ",".join(analytics.get("keyword_match", {}).get("missing_skills", [])),
                    "recommendations": ",".join(analytics.get("suggestions", [])),
                }
                save_analysis_data(resume_id, analysis_data)
                print(f"[upload:{request_id}] persisted resume_id={resume_id}")

            print(f"[upload:{request_id}] success")
        
        return {
            "success": True, 
            "filename": file.filename, 
            "text": text,
            "analytics": analytics,
            "ai_analysis": ai_analysis,
            "suggested_jobs": suggested_jobs,
            "target_role": target_role,
            "target_category": target_category,
        }
    except Exception as e:
        print(f"[upload:{request_id}] failed error={str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai-analyze")
async def analyze_with_ai(
    request: AIAnalysisRequest,
    current_user: Dict[str, Any] = Depends(_require_user),
):
    request_id = secrets.token_hex(4)
    try:
        print(f"[ai:{request_id}] start user={current_user.get('email', '')} role={request.target_role} category={request.target_category} text_len={len(request.resume_text or '')}")
        role_info = _find_role_info(request.target_category, request.target_role)
        result = _run_ai_analysis_with_retry(
            request.resume_text,
            target_role=request.target_role,
            role_info=role_info,
            model=request.model,
        )
        print(f"[ai:{request_id}] complete error={result.get('error') if isinstance(result, dict) else 'n/a'} score={result.get('score') if isinstance(result, dict) else 'n/a'}")

        # Optionally persist AI analysis if we can map a resume with email/name.
        if result and not result.get("error"):
            ai_row_id = save_ai_analysis_data(
                resume_id=0,
                analysis_data={
                    "owner_email": current_user.get("email", ""),
                    "model_used": result.get("model_used", request.model),
                    "resume_score": result.get("score", 0),
                    "job_role": request.target_role,
                },
            )
            print(f"[ai:{request_id}] persisted analysis_id={ai_row_id}")
            return {"success": True, "analysis": result, "analysis_id": ai_row_id}

        return {"success": True, "analysis": result}
    except Exception as e:
        print(f"[ai:{request_id}] failed error={str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/job-roles")
async def get_job_roles():
    return {"success": True, "roles": JOB_ROLES}


@app.post("/api/jobs/search")
async def search_jobs(request: JobSearchRequest):
    if not request.job_title.strip():
        raise HTTPException(status_code=400, detail="Job title is required")

    jobs = _fetch_real_jobs(request.job_title.strip(), request.location.strip(), limit=12)
    experience = {"id": request.experience_id, "text": request.experience_id}
    portal_results = job_portal.search_jobs(request.job_title.strip(), request.location.strip(), experience)

    if not jobs:
        jobs = _portal_results_to_job_rows(
            portal_results,
            request.job_title.strip(),
            request.location.strip() or "Remote/India",
        )

    return {
        "success": True,
        "results": jobs,
        "portals": portal_results,
    }


@app.post("/api/jobs/suggestions")
async def get_job_suggestions(request: SuggestionsQuery):
    query = (request.query or "").lower().strip()
    location_query = (request.location_query or "").lower().strip()

    job_matches = [j for j in JOB_SUGGESTIONS if query and query in j["text"].lower()][:8]
    location_matches = [l for l in LOCATION_SUGGESTIONS if location_query and location_query in l["text"].lower()][:8]

    return {
        "success": True,
        "job_suggestions": job_matches,
        "location_suggestions": location_matches,
        "experience_ranges": EXPERIENCE_RANGES,
        "salary_ranges": SALARY_RANGES,
        "job_types": JOB_TYPES,
    }


@app.get("/api/dashboard/summary")
async def get_dashboard_summary(current_user: Dict[str, Any] = Depends(_require_user)):
    user_email = current_user.get("email", "")
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM resume_data WHERE owner_email = ?", (user_email,))
    total_resumes = cursor.fetchone()["count"]

    cursor.execute(
        """
        SELECT ROUND(AVG(ra.ats_score), 1) as avg_ats
        FROM resume_analysis ra
        INNER JOIN resume_data rd ON rd.id = ra.resume_id
        WHERE rd.owner_email = ?
        """,
        (user_email,),
    )
    avg_ats = cursor.fetchone()["avg_ats"] or 0

    cursor.execute(
        """
        SELECT rd.target_role as role, COUNT(*) as count
        FROM resume_data rd
                WHERE rd.owner_email = ?
                    AND rd.target_role IS NOT NULL
                    AND rd.target_role != ''
        GROUP BY rd.target_role
        ORDER BY count DESC
        LIMIT 5
                """,
                (user_email,),
    )
    top_roles = cursor.fetchall()

    cursor.execute(
        """
        SELECT DATE(rd.created_at) as date, COUNT(*) as count
        FROM resume_data rd
        WHERE rd.owner_email = ?
          AND rd.created_at >= date('now', '-14 days')
        GROUP BY DATE(rd.created_at)
        ORDER BY date
        """,
        (user_email,),
    )
    daily_submissions = cursor.fetchall()

    cursor.execute(
        """
        SELECT COUNT(*) as total_analyses, ROUND(AVG(resume_score), 1) as average_score
        FROM ai_analysis
        WHERE owner_email = ?
        """,
        (user_email,),
    )
    ai_base = cursor.fetchone() or {"total_analyses": 0, "average_score": 0}

    cursor.execute(
        """
        SELECT model_used as model, COUNT(*) as count
        FROM ai_analysis
        WHERE owner_email = ?
        GROUP BY model_used
        ORDER BY count DESC
        """,
        (user_email,),
    )
    model_usage = cursor.fetchall()

    cursor.execute(
        """
        SELECT job_role as role, COUNT(*) as count
        FROM ai_analysis
        WHERE owner_email = ?
        GROUP BY job_role
        ORDER BY count DESC
        LIMIT 5
        """,
        (user_email,),
    )
    top_job_roles = cursor.fetchall()
    conn.close()

    ai_stats = {
        "total_analyses": ai_base.get("total_analyses") or 0,
        "average_score": ai_base.get("average_score") or 0,
        "model_usage": model_usage,
        "top_job_roles": top_job_roles,
    }

    return {
        "success": True,
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "full_name": current_user.get("full_name") or "",
        },
        "summary": {
            "total_resumes": total_resumes,
            "average_ats_score": avg_ats,
            "top_roles": top_roles,
            "daily_submissions": daily_submissions,
            "ai_stats": ai_stats,
        },
    }


@app.get("/api/dashboard/recent")
async def get_recent_submissions(current_user: Dict[str, Any] = Depends(_require_user)):
    user_email = current_user.get("email", "")
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            rd.id,
            rd.name,
            rd.email,
            rd.target_role,
            rd.target_category,
            rd.created_at,
            ra.ats_score,
            ra.keyword_match_score,
            ra.format_score,
            ra.section_score
        FROM resume_data rd
        LEFT JOIN resume_analysis ra ON ra.resume_id = rd.id
        WHERE rd.owner_email = ?
        ORDER BY rd.created_at DESC
        LIMIT 20
        """,
        (user_email,),
    )
    rows = cursor.fetchall()
    conn.close()
    return {"success": True, "items": rows}


@app.get("/api/admin/analytics")
async def get_admin_analytics(admin: Dict[str, Any] = Depends(_require_admin)):
    """Get admin analytics data for dashboard (admin only)"""
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    
    # Total statistics
    cursor.execute("SELECT COUNT(*) as count FROM resume_data")
    total_resumes = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM users")
    total_users = cursor.fetchone()["count"]
    
    cursor.execute("SELECT COUNT(*) as count FROM ai_analysis")
    total_analyses = cursor.fetchone()["count"]
    
    cursor.execute("SELECT ROUND(AVG(ats_score), 1) as avg FROM resume_analysis WHERE ats_score IS NOT NULL")
    avg_ats_score = cursor.fetchone()["avg"] or 0
    
    # Resume uploads over time (last 30 days)
    cursor.execute("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM resume_data
        WHERE created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
    """)
    daily_uploads = cursor.fetchall()
    
    # Distribution by target category
    cursor.execute("""
        SELECT target_category as category, COUNT(*) as count
        FROM resume_data
        WHERE target_category IS NOT NULL AND target_category != ''
        GROUP BY target_category
        ORDER BY count DESC
    """)
    category_distribution = cursor.fetchall()
    
    # Top 10 job roles
    cursor.execute("""
        SELECT target_role as role, COUNT(*) as count
        FROM resume_data
        WHERE target_role IS NOT NULL AND target_role != ''
        GROUP BY target_role
        ORDER BY count DESC
        LIMIT 10
    """)
    top_roles = cursor.fetchall()
    
    # AI model usage distribution
    cursor.execute("""
        SELECT model_used as model, COUNT(*) as count
        FROM ai_analysis
        WHERE model_used IS NOT NULL
        GROUP BY model_used
        ORDER BY count DESC
    """)
    model_usage = cursor.fetchall()
    
    # Average scores by category
    cursor.execute("""
        SELECT 
            rd.target_category as category,
            ROUND(AVG(ra.ats_score), 1) as avg_ats_score,
            COUNT(*) as count
        FROM resume_data rd
        LEFT JOIN resume_analysis ra ON ra.resume_id = rd.id
        WHERE rd.target_category IS NOT NULL 
            AND rd.target_category != ''
            AND ra.ats_score IS NOT NULL
        GROUP BY rd.target_category
        ORDER BY count DESC
    """)
    scores_by_category = cursor.fetchall()
    
    # Top AI analyzed job roles
    cursor.execute("""
        SELECT job_role as role, COUNT(*) as count
        FROM ai_analysis
        WHERE job_role IS NOT NULL AND job_role != ''
        GROUP BY job_role
        ORDER BY count DESC
        LIMIT 10
    """)
    ai_job_roles = cursor.fetchall()
    
    # Average AI scores
    cursor.execute("""
        SELECT ROUND(AVG(resume_score), 1) as avg_score
        FROM ai_analysis
        WHERE resume_score IS NOT NULL
    """)
    avg_ai_score = cursor.fetchone()["avg_score"] or 0
    
    conn.close()
    
    return {
        "success": True,
        "data": {
            "overview": {
                "total_resumes": total_resumes,
                "total_users": total_users,
                "total_analyses": total_analyses,
                "avg_ats_score": avg_ats_score,
                "avg_ai_score": avg_ai_score
            },
            "daily_uploads": daily_uploads,
            "category_distribution": category_distribution,
            "top_roles": top_roles,
            "model_usage": model_usage,
            "scores_by_category": scores_by_category,
            "ai_job_roles": ai_job_roles
        }
    }


@app.get("/api/admin/reports")
async def get_admin_reports(
    admin: Dict[str, Any] = Depends(_require_admin),
    year: Optional[str] = None,
    category: Optional[str] = None,
    role: Optional[str] = None,
):
    """Get filtered reports data for admin (admin only)"""
    conn = get_database_connection()
    conn.row_factory = _dict_factory
    cursor = conn.cursor()
    
    # Build dynamic query based on filters
    query = """
        SELECT 
            rd.id,
            rd.name,
            rd.email,
            rd.phone,
            rd.owner_email,
            rd.target_role,
            rd.target_category,
            rd.linkedin,
            rd.github,
            rd.created_at,
            ra.ats_score,
            ai.resume_score as ai_score,
            ai.model_used
        FROM resume_data rd
        LEFT JOIN resume_analysis ra ON ra.resume_id = rd.id
        LEFT JOIN ai_analysis ai ON ai.resume_id = rd.id
        WHERE 1=1
    """
    
    params = []
    
    # Apply filters
    if year:
        query += " AND strftime('%Y', rd.created_at) = ?"
        params.append(year)
    
    if category:
        query += " AND rd.target_category = ?"
        params.append(category)
    
    if role:
        query += " AND rd.target_role = ?"
        params.append(role)
    
    query += " ORDER BY rd.created_at DESC"
    
    cursor.execute(query, params)
    records = cursor.fetchall()
    
    # Get unique filter options
    cursor.execute("""
        SELECT DISTINCT strftime('%Y', created_at) as year
        FROM resume_data
        WHERE created_at IS NOT NULL
        ORDER BY year DESC
    """)
    available_years = [row["year"] for row in cursor.fetchall() if row["year"]]
    
    cursor.execute("""
        SELECT DISTINCT target_category
        FROM resume_data
        WHERE target_category IS NOT NULL AND target_category != ''
        ORDER BY target_category
    """)
    available_categories = [row["target_category"] for row in cursor.fetchall()]
    
    cursor.execute("""
        SELECT DISTINCT target_role
        FROM resume_data
        WHERE target_role IS NOT NULL AND target_role != ''
        ORDER BY target_role
    """)
    available_roles = [row["target_role"] for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "success": True,
        "data": {
            "records": records,
            "filters": {
                "years": available_years,
                "categories": available_categories,
                "roles": available_roles
            }
        }
    }


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
