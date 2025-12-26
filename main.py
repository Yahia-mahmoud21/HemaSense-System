from fastapi import FastAPI, Request, Form, HTTPException, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse, RedirectResponse
from pydantic import BaseModel
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
import os
from datetime import datetime
import uvicorn
from database.database import *
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
import torch
import torchvision.transforms as transforms
from threading import Thread
from typing import Optional
import pickle
import numpy as np
import joblib


app = FastAPI()

# Add session middleware (secret key should be environment variable in production)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-change-in-production")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="templates"), name="static")
templates = Jinja2Templates(directory="templates")

# Load Decision Tree ML Model
try:
   # Reload the model from the pickle file
    with open('DecisionTree.pkl', 'rb') as file:
        loaded_model = pickle.load(file)
    print("✓ Decision Tree model loaded successfully")
    

except Exception as e:
    print(f"⚠ Warning: Could not load Decision Tree model: {e}")
    ml_model = None

# # Load AI Model
# model_name = "SciReason-LFM2-2.6B"
# tokenizer = AutoTokenizer.from_pretrained(model_name)
# model = AutoModelForCausalLM.from_pretrained(
#     model_name,
#     device_map="auto",
#     torch_dtype=torch.float16
# )
# model.eval()


# ============ PYDANTIC MODELS ============

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str  # 'doctor' or 'secretary'


class PatientCreate(BaseModel):
    name: str
    age: int
    phone: str
    total_payment: int
    secertary_id: int


class PatientUpdate(BaseModel):
    name: str
    age: int
    phone: str
    total_payment: int


class PaymentRequest(BaseModel):
    amount: float


class ReportCreate(BaseModel):
    patient_id: int
    WBC: float
    RBC: float
    HGB: float
    HCT: float
    MCV: float
    MCH: float
    MCHC: float
    PLT: float
    Diagnosis: str


class CBCData(BaseModel):
    WBC: float
    RBC: float
    HGB: float
    HCT: float
    MCV: float
    MCH: float
    MCHC: float
    PLT: float


class AiDiagnosis(BaseModel):
    prompt: str
    cbc_data: Optional[CBCData] = None



# ============ AUTHENTICATION HELPERS ============

def get_current_user(request: Request):
    """Get current user from session"""
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_doctor(request: Request):
    """Require doctor role"""
    user = get_current_user(request)
    if user.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access required")
    return user


# ============ TEMPLATE ROUTES ============

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Home page with login selection"""
    return templates.TemplateResponse("home.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Login page"""
    role = request.query_params.get("role", "secretary")
    return templates.TemplateResponse("login.html", {"request": request, "role": role})


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Dashboard page - requires authentication"""
    try:
        user = get_current_user(request)
        return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})
    except HTTPException:
        return RedirectResponse(url="/login")


@app.get("/patients", response_class=HTMLResponse)
async def patients_page(request: Request):
    """Patients page - requires authentication"""
    try:
        user = get_current_user(request)
        return templates.TemplateResponse("patients.html", {"request": request, "user": user})
    except HTTPException:
        return RedirectResponse(url="/login")


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Patient registration page"""
    try:
        user = get_current_user(request)
        return templates.TemplateResponse("index.html", {"request": request, "user": user})
    except HTTPException:
        return RedirectResponse(url="/login")


@app.get("/reports/pending", response_class=HTMLResponse)
async def pending_reports(request: Request):
    """Pending reports page - DOCTOR ONLY"""
    try:
        user = require_doctor(request)
        return templates.TemplateResponse("report_list.html", {"request": request, "user": user})
    except HTTPException:
        return RedirectResponse(url="/login")


@app.get("/reports/create/{patient_id}", response_class=HTMLResponse)
async def create_report_page(request: Request, patient_id: int):
    """Create report page - DOCTOR ONLY"""
    try:
        user = require_doctor(request)
        return templates.TemplateResponse("create_report.html", {
            "request": request, 
            "user": user,
            "patient_id": patient_id
        })
    except HTTPException:
        return RedirectResponse(url="/login")


@app.get("/reports/print/{patient_id}", response_class=HTMLResponse)
async def print_preview_page(request: Request, patient_id: int):
    """Print preview page - requires authentication"""
    try:
        user = get_current_user(request)
        return templates.TemplateResponse("print_preview.html", {
            "request": request, 
            "user": user,
            "patient_id": patient_id
        })
    except HTTPException:
        return RedirectResponse(url="/login")


# ============ AUTHENTICATION API ============

@app.post("/api/login")
async def login(request: Request, credentials: LoginRequest):
    """Login endpoint for both doctor and secretary"""
    if credentials.role == "doctor":
        user = authenticate_doctor(credentials.username, credentials.password)
        if user:
            request.session["user"] = {
                "user_id": user["doctor_id"],
                "name": user["name"],
                "role": "doctor"
            }
            return {"success": True, "user": request.session["user"]}
    
    # For secretary, we'll use a simple check (you can add secretary table with credentials)
    # For now, just check if secretary exists by name
    elif credentials.role == "secretary":
        secretaries = get_all_secretaries()
        for sec in secretaries:
            if sec["name"].lower() == credentials.username.lower():
                request.session["user"] = {
                    "user_id": sec["secertary_id"],
                    "name": sec["name"],
                    "role": "secretary"
                }
                return {"success": True, "user": request.session["user"]}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/api/logout")
async def logout(request: Request):
    """Logout endpoint"""
    request.session.clear()
    return {"success": True}


@app.get("/api/current-user")
async def current_user(request: Request):
    """Get current logged-in user"""
    try:
        user = get_current_user(request)
        return user
    except HTTPException:
        return None


# ============ PATIENT API ============

@app.get("/api/patients")
async def get_patients(request: Request):
    """Get all patients"""
    get_current_user(request)  # Require authentication
    patients = get_all_patients()
    return patients


@app.get("/api/patients/{patient_id}")
async def get_patient(request: Request, patient_id: int):
    """Get single patient"""
    get_current_user(request)
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@app.post("/api/patients")
async def create_patient_api(request: Request, patient: PatientCreate):
    """Create new patient"""
    get_current_user(request)
    patient_id = create_patient(
        patient.name,
        patient.age,
        patient.phone,
        patient.total_payment,
        patient.secertary_id
    )
    if patient_id:
        return {"success": True, "patient_id": patient_id}
    raise HTTPException(status_code=500, detail="Failed to create patient")


@app.put("/api/patients/{patient_id}")
async def update_patient_api(request: Request, patient_id: int, patient: PatientUpdate):
    """Update patient"""
    get_current_user(request)
    success = update_patient(
        patient_id,
        patient.name,
        patient.age,
        patient.phone,
        patient.total_payment
    )
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to update patient")


@app.delete("/api/patients/{patient_id}")
async def delete_patient_api(request: Request, patient_id: int):
    """Delete patient"""
    get_current_user(request)
    success = delete_patient(patient_id)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to delete patient")


@app.post("/api/patients/{patient_id}/payment")
async def add_payment_api(request: Request, patient_id: int, payment: PaymentRequest):
    """Add payment to patient"""
    get_current_user(request)
    new_remaining = update_payment(patient_id, payment.amount)
    if new_remaining is not None:
        return {"success": True, "new_remaining": new_remaining}
    raise HTTPException(status_code=500, detail="Failed to add payment")


# ============ REPORT API ============

@app.get("/api/reports/pending")
async def get_pending_reports_api(request: Request):
    """Get patients without reports - DOCTOR ONLY"""
    require_doctor(request)
    patients = get_patients_without_reports()
    return patients


@app.get("/api/reports")
async def get_all_reports_api(request: Request):
    """Get all reports - DOCTOR ONLY"""
    require_doctor(request)
    reports = get_all_reports()
    return reports


@app.get("/api/reports/patient/{patient_id}")
async def get_patient_report_api(request: Request, patient_id: int):
    """Get report for specific patient"""
    get_current_user(request)
    report = get_report_by_patient(patient_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.post("/api/reports")
async def create_report_api(request: Request, report: ReportCreate):
    """Create new report - DOCTOR ONLY"""
    require_doctor(request)
    report_id = create_report(
        report.patient_id,
        report.WBC,
        report.RBC,
        report.HGB,
        report.HCT,
        report.MCV,
        report.MCH,
        report.MCHC,
        report.PLT,
        report.Diagnosis
    )
    if report_id:
        return {"success": True, "report_id": report_id}
    raise HTTPException(status_code=500, detail="Failed to create report")


# ============ SECRETARY API ============

@app.get("/api/secretaries")
async def get_secretaries_api(request: Request):
    """Get all secretaries"""
    get_current_user(request)
    secretaries = get_all_secretaries()
    return secretaries


# ============ DASHBOARD API ============

@app.get("/api/dashboard/stats")
async def get_dashboard_stats_api(request: Request):
    """Get dashboard statistics"""
    get_current_user(request)
    stats = get_dashboard_stats()
    return stats


# ============ ML PREDICTION API ============
from sklearn.preprocessing import StandardScaler

@app.post("/api/predict")
async def predict_diagnosis(request: Request, cbc_data: CBCData):
    """Predict diagnosis from CBC values using ML model - DOCTOR ONLY"""
    require_doctor(request)
    scaler = joblib.load("scaler.pkl")
    diagnosis_map = {
        0 : 'Healthy',
        1 : 'Other microcytic anemia',
        2 : 'Iron deficiency anemia',
        3 : 'Normocytic hypochromic anemia',
        4 : 'Normocytic normochromic anemia',
        5 : 'Macrocytic anemia',
        6 : 'Thrombocytopenia',
        7: 'Leukemia',
        8 : 'Leukemia with thrombocytopenia'
    }
    # cbc['Diagnosis'] = cbc['Diagnosis'].map(diagnosis_map)
    # Check if model is loaded
    if loaded_model is None:
        # Fallback to rule-based prediction if model is not loaded
        diagnosis = "Normal"
        confidence = 0.85
        
        if cbc_data.HGB < 13.5:
            diagnosis = "Anemia Detected"
            confidence = 0.92
        elif cbc_data.WBC > 11.0:
            diagnosis = "Elevated WBC - Further Investigation Needed"
            confidence = 0.88
        elif cbc_data.PLT < 150:
            diagnosis = "Low Platelet Count"
            confidence = 0.90
    else:
        # Use trained Decision Tree model
        try:
            # Prepare features in the correct order for the model
            # [WBC, RBC, HGB, HCT, MCV, MCH, MCHC, PLT]
            features = np.array([[
                cbc_data.WBC,
                cbc_data.RBC,
                cbc_data.HGB,
                cbc_data.HCT,
                cbc_data.MCV,
                cbc_data.MCH,
                cbc_data.MCHC,
                cbc_data.PLT
            ]])
            features = scaler.transform(features)

            print(features)
            # Get prediction
            prediction = loaded_model.predict(features)[0]
            prediction = diagnosis_map.get(int(prediction), "Unknown")

            # Get probability/confidence if available
            if hasattr(loaded_model, 'predict_proba'):
                probabilities = loaded_model.predict_proba(features)[0]
                print(prediction)

                confidence = float(max(probabilities))
            else:
                confidence = 0.85  # Default confidence for models without probability
            
            # Map prediction to diagnosis string
            diagnosis = str(prediction)
            
        except Exception as e:
            print(f"Error during prediction: {e}")
            diagnosis = "Error in prediction"
            confidence = 0.0
    
    return {
        "diagnosis": diagnosis,
        "confidence": confidence
    }



# ============ AI CHAT API ============
# def build_prompt(prompt, cbc_data: CBCData ):
#     print(f"build_prompt called with cbc_data: {cbc_data}")
#     print(f"cbc_data type: {type(cbc_data)}")
#     print(f"cbc_data is None: {cbc_data is None}")
#     print(f"bool(cbc_data): {bool(cbc_data)}")
    
#     if cbc_data is not None:
#         try:
#             main_prompt = f"""
#         this is CBC values for specific patient,
#         WBC : {cbc_data.WBC},
#         RBC : {cbc_data.RBC},
#         HGB : {cbc_data.HGB},
#         HCT : {cbc_data.HCT},
#         MCV : {cbc_data.MCV},
#         MCH : {cbc_data.MCH},
#         MCHC : {cbc_data.MCHC},
#         PLT : {cbc_data.PLT},

#         {prompt}
#         """
#             print("Using CBC data in prompt")
#             print(main_prompt)
#             return main_prompt
#         except Exception as e:
#             print(f"Error accessing cbc_data attributes: {e}")
#             return prompt
#     else:
#         print("No CBC data provided, using prompt only")
#         return prompt



# @app.post("/api/ai/diagnosis/stream")
# async def ai_diagnosis_stream(request: Request):
#     """AI diagnosis streaming endpoint - requires authentication"""
#     get_current_user(request)  # Require authentication
    
#     # Parse request body manually to debug
#     body = await request.json()
#     print(f"Raw request body: {body}")
    
#     # Validate and parse the data
#     try:
#         data = AiDiagnosis(**body)
#         print(f"Parsed prompt: {data.prompt}")
#         print(f"Parsed cbc_data: {data.cbc_data}")
#         print(f"cbc_data type: {type(data.cbc_data)}")
#         print(f"cbc_data is None: {data.cbc_data is None}")
#     except Exception as e:
#         print(f"Error parsing request: {e}")
#         raise HTTPException(status_code=400, detail=f"Invalid request data: {str(e)}")
    
#     messages = [
#         {"role": "user", "content": build_prompt(data.prompt, data.cbc_data)}
#     ]

#     inputs = tokenizer.apply_chat_template(
#         messages,
#         add_generation_prompt=True,
#         tokenize=True,
#         return_tensors="pt",
#         return_dict=True
#     ).to(model.device)

#     streamer = TextIteratorStreamer(
#         tokenizer,
#         skip_prompt=True,
#         skip_special_tokens=True
#     )

#     generation_thread = Thread(
#         target=model.generate,
#         kwargs=dict(
#             **inputs,
#             max_new_tokens=800,
#             do_sample=True,
#             temperature=0.7,
#             top_p=0.9,
#             streamer=streamer
#         )
#     )
#     generation_thread.start()

#     def token_stream():
#         for new_text in streamer:
#             yield new_text

#     return StreamingResponse(token_stream(), media_type="text/plain")


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=7500, reload=True)