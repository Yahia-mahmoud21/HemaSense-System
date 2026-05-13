using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
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

        // ── OLD REPORTS (patients who already have a report) ────────────

        // GET /Reports/OldReports?offset=0
        public async Task<IActionResult> OldReports(int offset = 0)
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return doctorAuth;

            const int pageSize = 10;
            var all   = (await _db.GetAllReportsAsync()).ToList();
            var paged = all.Skip(offset).Take(pageSize).ToList();

            ViewBag.User     = GetCurrentUser();
            ViewBag.Offset   = offset;
            ViewBag.PageSize = pageSize;
            ViewBag.HasMore  = (offset + pageSize) < all.Count;
            ViewBag.Total    = all.Count;

            return View(paged);
        }

        // GET /Reports/SearchReports?q=john&offset=0
        [HttpGet]
        public async Task<IActionResult> SearchReports(string q = "", int offset = 0)
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return Unauthorized();

            const int pageSize = 10;
            var all = (await _db.GetAllReportsAsync()).ToList();

            if (!string.IsNullOrWhiteSpace(q))
            {
                q = q.Trim().ToLower();
                bool isId = int.TryParse(q, out int searchId);
                all = isId
                    ? all.Where(r => r.PatientId == searchId || r.ReportId == searchId).ToList()
                    : all.Where(r => (r.PatientName ?? "").ToLower().Contains(q)).ToList();
                offset = 0; // always reset when searching
            }

            var paged   = all.Skip(offset).Take(pageSize).ToList();
            bool hasMore = (offset + pageSize) < all.Count;

            return Json(new
            {
                reports = paged.Select(r => new
                {
                    r.ReportId,
                    r.PatientId,
                    patientIdFormatted = r.PatientId.ToString("D3"),
                    r.PatientName,
                    r.PatientAge,
                    r.PatientPhone,
                    patientDate = r.PatientDate.HasValue
                        ? r.PatientDate.Value.ToString("MMM dd, yyyy") : "-",
                    r.Diagnosis,
                    r.WBC, r.RBC, r.HGB, r.HCT,
                    r.MCV, r.MCH, r.MCHC, r.PLT
                }),
                hasMore,
                total = all.Count
            });
        }

        // GET /Reports/EditReport/5  (5 = report_id)
        public async Task<IActionResult> EditReport(int id)
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return doctorAuth;

            var report = await _db.GetReportByIdAsync(id);
            if (report == null) return NotFound();

            ViewBag.User = GetCurrentUser();
            return View(report);
        }

        // POST /Reports/EditReport/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditReport(int id, Report report)
        {
            var doctorAuth = RequireDoctor();
            if (doctorAuth != null) return doctorAuth;

            report.ReportId = id;

            if (!ModelState.IsValid)
            {
                ViewBag.User = GetCurrentUser();
                return View(report);
            }

            await _db.UpdateReportAsync(report);
            TempData["Success"] = $"Report #{id} updated successfully!";
            return RedirectToAction("OldReports");
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
