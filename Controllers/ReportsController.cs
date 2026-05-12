using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Threading.Tasks;

namespace HemaSense.Controllers
{
    /// <summary>
    /// Routes:
    ///   GET  /Reports/Pending        – pending reports list (Doctor only)
    ///   GET  /Reports/Create/5       – create report form
    ///   POST /Reports/Create         – save report
    ///   GET  /Reports/Print/5        – print preview
    ///   POST /Reports/Predict        – ML prediction (JSON)
    /// </summary>
    public class ReportsController : BaseController
    {
        private readonly DatabaseService _db;
        private readonly DiagnosisService _diag;

        public ReportsController(DatabaseService db, DiagnosisService diag)
        {
            _db   = db;
            _diag = diag;
        }

        // GET /Reports/Pending
        public async Task<IActionResult> Pending()
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return doctorAuth;

            ViewBag.User = GetCurrentUser();
            var pending = await _db.GetPatientsWithoutReportsAsync();
            return View(pending);
        }

        // GET /Reports/Create/5
        public async Task<IActionResult> Create(int id)
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return doctorAuth;

            var patient = await _db.GetPatientByIdAsync(id);
            if (patient == null) return NotFound();

            ViewBag.User    = GetCurrentUser();
            ViewBag.Patient = patient;

            var report = new Report { PatientId = id };
            return View(report);
        }

        // POST /Reports/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Report report)
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return doctorAuth;

            if (!ModelState.IsValid)
            {
                var patient = await _db.GetPatientByIdAsync(report.PatientId);
                ViewBag.User    = GetCurrentUser();
                ViewBag.Patient = patient;
                return View(report);
            }

            int reportId = await _db.CreateReportAsync(report);
            TempData["Success"] = $"Report #{reportId} created successfully!";
            return RedirectToAction("Print", new { id = report.PatientId });
        }

        // GET /Reports/Print/5
        public async Task<IActionResult> Print(int id)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            var patient = await _db.GetPatientByIdAsync(id);
            if (patient == null) return NotFound();

            var report = await _db.GetReportByPatientAsync(id);

            ViewBag.User    = GetCurrentUser();
            ViewBag.Patient = patient;
            ViewBag.Report  = report;
            return View();
        }

        // POST /Reports/Predict  (JSON API – called from JavaScript)
        [HttpPost]
        public async Task<IActionResult> Predict([FromBody] PredictRequest request)
        {
            var auth = RequireAuth();
            if (auth != null) return Unauthorized(new { error = "Authentication required" });

            if (request == null)
                return BadRequest(new { error = "Invalid data" });

            var (diagnosis, confidence) = await _diag.PredictAsync(request);
            return Json(new { diagnosis, confidence });
        }
    }
}
