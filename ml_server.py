from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
import torch
from threading import Thread
import pickle
import numpy as np
import joblib
import os

app = FastAPI()

# Get the directory where ml_server.py is located
BASE_DIR = r"C:\Users\mahmo\OneDrive\Desktop\College Level 3\first term\projects\Secretary"

# Allow CORS for the C# MVC app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
try:
    dt_path = os.path.join(BASE_DIR, 'DecisionTree.pkl')
    scaler_path = os.path.join(BASE_DIR, 'scaler.pkl')
    with open(dt_path, 'rb') as file:
        loaded_model = pickle.load(file)
    scaler = joblib.load(scaler_path)
    print("[OK] Decision Tree model & scaler loaded successfully")
except Exception as e:
    print(f"[ERROR] Could not load ML models: {e}")
    loaded_model = None
    scaler = None

try:
    model_name = os.path.join(BASE_DIR, "SciReason-LFM2-2.6B")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        device_map="auto",
        torch_dtype=torch.float16
    )
    model.eval()
    print("[OK] LLM loaded successfully")
except Exception as e:
    print(f"[ERROR] Could not load LLM: {e}")
    model = None

# Pydantic Models
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

@app.post("/api/predict")
async def predict_diagnosis(cbc_data: CBCData):
    diagnosis_map = {
        0 : 'Normal',
        1 : 'Other microcytic anemia',
        2 : 'Iron deficiency anemia',
        3 : 'Normocytic hypochromic anemia',
        4 : 'Normocytic normochromic anemia',
        5 : 'Macrocytic anemia',
        6 : 'Thrombocytopenia',
        7: 'Leukemia',
        8 : 'Leukemia with thrombocytopenia'
    }

    if loaded_model is None or scaler is None:
        return {"diagnosis": "Error: Model not loaded", "confidence": 0.0}

    try:
        features = np.array([[
            cbc_data.WBC, cbc_data.RBC, cbc_data.HGB, cbc_data.HCT,
            cbc_data.MCV, cbc_data.MCH, cbc_data.MCHC, cbc_data.PLT
        ]])
        features = scaler.transform(features)
        
        prediction = loaded_model.predict(features)[0]
        prediction_str = diagnosis_map.get(int(prediction), "Unknown")

        if hasattr(loaded_model, 'predict_proba'):
            probabilities = loaded_model.predict_proba(features)[0]
            confidence = float(max(probabilities))
        else:
            confidence = 0.85
            
        return {"diagnosis": prediction_str, "confidence": confidence}
    except Exception as e:
        print(f"Prediction error: {e}")
        return {"diagnosis": "Error in prediction", "confidence": 0.0}

def build_prompt(prompt, cbc_data: CBCData):
    if cbc_data is not None:
        main_prompt = f"""
        this is CBC values for specific patient,
        WBC : {cbc_data.WBC},
        RBC : {cbc_data.RBC},
        HGB : {cbc_data.HGB},
        HCT : {cbc_data.HCT},
        MCV : {cbc_data.MCV},
        MCH : {cbc_data.MCH},
        MCHC : {cbc_data.MCHC},
        PLT : {cbc_data.PLT},

        {prompt}
        """
        return main_prompt
    return prompt

@app.post("/api/ai/diagnosis/stream")
async def ai_diagnosis_stream(data: AiDiagnosis):
    if model is None:
        def err_stream():
            yield "LLM not loaded properly on the ML server."
        return StreamingResponse(err_stream(), media_type="text/plain")

    messages = [
        {"role": "user", "content": build_prompt(data.prompt, data.cbc_data)}
    ]

    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_tensors="pt",
        return_dict=True
    ).to(model.device)

    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True
    )

    generation_thread = Thread(
        target=model.generate,
        kwargs=dict(
            **inputs,
            max_new_tokens=800,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            streamer=streamer
        )
    )
    generation_thread.start()

    def token_stream():
        for new_text in streamer:
            yield new_text

    return StreamingResponse(token_stream(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_server:app", host="127.0.0.1", port=7500, reload=False)
