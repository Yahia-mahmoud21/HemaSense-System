# HemaSense – ASP.NET MVC C# Implementation

**Re-implementation of the Python/FastAPI "Secretary" project in ASP.NET Core MVC (.NET 8)**

---

## Team members
- Mohammed Abdel-Samie
- Yahia Mahmoud Farouk
- Mahmoud Ahmed Abd El-Hameed
- Anwar Ayman Anwar

---

## Project Overview

HemaSense is a **Laboratory Management System** rebuilt using **ASP.NET Core MVC** following the classic **MVC (Model–View–Controller)** architectural pattern. It provides the same features as the original Python/FastAPI version:

| Feature | Python Original | .NET MVC |
|---|---|---|
| Web Framework | FastAPI | ASP.NET Core MVC 8 |
| Database | MySQL + raw mysql.connector | MySQL + Dapper (raw SQL) |
| Authentication | Session middleware | `ISession` + JSON serialization |
| ML Prediction | scikit-learn DecisionTree (.pkl) | **Python `ml_server.py` microservice** |
| LLM Chat | HuggingFace Transformers (SciReason-LFM2) | **Python `ml_server.py` microservice (streaming HTTP)** |
| Templates | Jinja2 HTML | Razor Views (.cshtml) |
| CSS | Vanilla CSS | Same design tokens, identical color palette |

---

## MVC Project Structure

```
HemaSense/
│
├── Models/                     ← Domain models + ViewModels
│   ├── Patient.cs              ← mirrors `patients` table
│   ├── Doctor.cs               ← mirrors `doctor` table
│   ├── Secretary.cs            ← mirrors `secertary` table
│   ├── Report.cs               ← mirrors `report` table
│   └── ViewModels.cs           ← LoginViewModel, DashboardStats, PredictRequest, SessionUser
│
├── Services/                   ← Business / Data Access layer
│   ├── DatabaseService.cs      ← equivalent of database/database.py (Dapper + raw SQL)
│   └── DiagnosisService.cs     ← equivalent of ML prediction (rule-based fallback)
│
├── Controllers/                ← Route handlers (equivalent of main.py routes)
│   ├── BaseController.cs       ← Auth helpers (RequireAuth, RequireDoctor)
│   ├── AccountController.cs    ← /Account/Login, /Account/Logout, /Account/Home
│   ├── DashboardController.cs  ← /Dashboard
│   ├── PatientsController.cs   ← /Patients (CRUD + Payment)
│   └── ReportsController.cs    ← /Reports (Pending, Create, Print, Predict)
│
├── Views/                      ← Razor views (equivalent of Jinja2 templates/)
│   ├── Shared/
│   │   ├── _Layout.cshtml      ← Base HTML layout
│   │   └── _Sidebar.cshtml     ← Reusable sidebar partial
│   ├── Account/
│   │   ├── Home.cshtml         ← home.html (role selection landing page)
│   │   └── Login.cshtml        ← login.html
│   ├── Dashboard/
│   │   └── Index.cshtml        ← dashboard.html
│   ├── Patients/
│   │   ├── Index.cshtml        ← patients.html (list + search)
│   │   ├── Register.cshtml     ← index.html (register patient form)
│   │   ├── Edit.cshtml         ← edit patient modal → dedicated page
│   │   ├── Details.cshtml      ← view patient modal → dedicated page
│   │   └── Payment.cshtml      ← payment modal → dedicated page
│   └── Reports/
│       ├── Pending.cshtml      ← report_list.html
│       ├── Create.cshtml       ← create_report.html (CBC + AI chat + predict)
│       └── Print.cshtml        ← print_preview.html (A4 printable report)
│
├── wwwroot/
│   └── css/
│       └── app.css             ← identical CSS variables as styles.css
│
├── Program.cs                  ← DI container, session, middleware
└── appsettings.json            ← MySQL connection string
```

---

## Prerequisites

- .NET 8 SDK (`dotnet --version` → 8.x or 10.x)
- MySQL Server running locally on port 3306
- Same `lab` database as the Python project

---

## Database Setup

The .NET project uses **the same MySQL database** as the Python project. No migration is needed. Ensure:

1. MySQL is running on `127.0.0.1:3306`
2. Database `lab` exists with tables: `patients`, `doctor`, `secertary`, `report`
3. Credentials match `appsettings.json` (`root` / `0000`)

### Update connection string if needed:
```json
// appsettings.json
"ConnectionStrings": {
  "DefaultConnection": "Server=127.0.0.1;Port=3306;Database=lab;Uid=root;Pwd=0000;"
}
```

---

## Running the Application

To run the application with the full AI features, you need to run both the Python ML server and the .NET MVC app.

### 1. Start the Python ML Server
Open a terminal in `projects/Secretary` where the `.pkl` and model files exist:
```bash
cd "College Level 3/first term/projects/Secretary"
pip install fastapi uvicorn pydantic transformers torch scikit-learn numpy joblib
python ml_server.py
```
*(This starts the ML API on `http://127.0.0.1:7500`)*

### 2. Start the ASP.NET MVC App
Open another terminal:
```bash
cd HemaSense
dotnet run
```

Then open: **https://localhost:5001** or **http://localhost:5000**

---

## Key Differences from Python Version

| Aspect | Python (FastAPI) | C# (ASP.NET MVC) |
|---|---|---|
| Login flow | JSON API + JS redirect | Server-side form POST + redirect |
| Patient CRUD | REST API (JSON) | Controller actions + Razor views |
| AI Prediction | `/api/predict` (internal) | Calls Python `http://127.0.0.1:7500/api/predict` via `HttpClient` |
| LLM Chat | Streaming HuggingFace model | Client-side JS fetches `http://127.0.0.1:7500/api/ai/diagnosis/stream` |
| LLM Chat | Streaming HuggingFace model | FAQ knowledge base (extensible) |
| Session | `starlette.middleware.sessions` | `ISession` distributed memory cache |
| Auth Guard | `get_current_user()` dependency | `BaseController.RequireAuth()` |

---

## NuGet Packages Used

| Package | Purpose |
|---|---|
| `MySql.Data` | MySQL driver (same DB as Python) |
| `Dapper` | Lightweight ORM, raw SQL like Python |
| `Microsoft.AspNetCore.Session` | Session management |
| `Microsoft.ML` | ML.NET (available for future ONNX model) |
