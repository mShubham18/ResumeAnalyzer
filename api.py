import os
import io
import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import existing application logic
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

class AIAnalysisRequest(BaseModel):
    resume_text: str
    target_role: str = ""

@app.get("/api/status")
async def get_status():
    return {"status": "ok", "message": "Resume Analyzer API is running"}

@app.post("/api/upload")
async def upload_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_obj = io.BytesIO(content)
        file_obj.name = file.filename
        
        if file.filename.endswith('.pdf'):
            text = analyzer.extract_text_from_pdf(file_obj)
        elif file.filename.endswith(('.doc', '.docx')):
            text = analyzer.extract_text_from_docx(file_obj)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
            
        # Run standard analysis
        analytics = analyzer.analyze_resume(text)
        
        return {
            "success": True, 
            "filename": file.filename, 
            "text": text,
            "analytics": analytics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-analyze")
async def analyze_with_ai(request: AIAnalysisRequest):
    try:
        result = ai_analyzer.analyze_with_ai(
            request.resume_text, 
            job_description=request.target_role
        )
        return {"success": True, "analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
