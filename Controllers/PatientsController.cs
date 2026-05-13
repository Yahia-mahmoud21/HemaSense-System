using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace HemaSense.Controllers
{
    /// <summary>
    /// Handles all patient CRUD operations and payment.
    /// Routes:
    ///   GET  /Patients           – list
    ///   GET  /Patients/Register  – registration form
    ///   POST /Patients/Create    – create patient
    ///   POST /Patients/Update    – update patient
    ///   POST /Patients/Delete/5  – delete patient
    ///   POST /Patients/Payment/5 – add payment
    /// </summary>
    public class PatientsController : BaseController
    {
        private readonly DatabaseService _db;

        public PatientsController(DatabaseService db) => _db = db;

        // GET /Patients
        public async Task<IActionResult> Index()
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            ViewBag.User = GetCurrentUser();
            var patients = await _db.GetAllPatientsAsync();
            return View(patients);
        }

        // GET /Patients/AllPatients?offset=0
        public async Task<IActionResult> AllPatients(int offset = 0)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            const int pageSize = 10;
            ViewBag.User = GetCurrentUser();
            ViewBag.Offset = offset;
            ViewBag.PageSize = pageSize;

            var patients = await _db.GetPagedPatientsAsync(offset, pageSize + 1); // fetch one extra to know if more exist
            var list = patients.ToList();
            ViewBag.HasMore = list.Count > pageSize;
            if (ViewBag.HasMore) list = list.Take(pageSize).ToList();

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                // Return partial rows for "load more"
                return PartialView("_PatientRows", list);
            }

            return View(list);
        }

        // GET /Patients/SearchPatients?q=john&offset=0
        [HttpGet]
        public async Task<IActionResult> SearchPatients(string q = "", int offset = 0)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            const int pageSize = 10;

            if (string.IsNullOrWhiteSpace(q))
            {
                var paged = await _db.GetPagedPatientsAsync(offset, pageSize + 1);
                var pagedList = paged.ToList();
                bool hasMore = pagedList.Count > pageSize;
                if (hasMore) pagedList = pagedList.Take(pageSize).ToList();

                return Json(new
                {
                    patients = pagedList.Select(p => new
                    {
                        p.PatientId,
                        p.Name,
                        p.Age,
                        p.Phone,
                        p.SecretaryName,
                        p.TotalPayment,
                        p.Remaining,
                        isComplete = p.Remaining <= 0,
                        nowDate = p.NowDate.HasValue ? p.NowDate.Value.ToString("MMM dd, yyyy") : "-"
                    }),
                    hasMore
                });
            }

            var results = await _db.SearchPatientsAsync(q, pageSize);
            return Json(new
            {
                patients = results.Select(p => new
                {
                    p.PatientId,
                    p.Name,
                    p.Age,
                    p.Phone,
                    p.SecretaryName,
                    p.TotalPayment,
                    p.Remaining,
                    isComplete = p.Remaining <= 0,
                    nowDate = p.NowDate.HasValue ? p.NowDate.Value.ToString("MMM dd, yyyy") : "-"
                }),
                hasMore = false
            });
        }

        // GET /Patients/Register
        public async Task<IActionResult> Register()
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            ViewBag.User = GetCurrentUser();
            ViewBag.Secretaries = await _db.GetAllSecretariesAsync();
            return View(new Patient());
        }

        // POST /Patients/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Patient patient)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            if (!ModelState.IsValid)
            {
                ViewBag.User = GetCurrentUser();
                ViewBag.Secretaries = await _db.GetAllSecretariesAsync();
                return View("Register", patient);
            }

            int newId = await _db.CreatePatientAsync(patient);
            TempData["Success"] = $"Patient registered successfully! ID: #{newId:D3}";
            return RedirectToAction("Index");
        }

        // GET /Patients/Edit/5
        public async Task<IActionResult> Edit(int id)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            var patient = await _db.GetPatientByIdAsync(id);
            if (patient == null) return NotFound();

            ViewBag.User = GetCurrentUser();
            return View(patient);
        }

        // POST /Patients/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, Patient patient)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            patient.PatientId = id;

            if (!ModelState.IsValid)
            {
                ViewBag.User = GetCurrentUser();
                return View(patient);
            }

            await _db.UpdatePatientAsync(patient);
            TempData["Success"] = "Patient updated successfully!";
            return RedirectToAction("Index");
        }

        // POST /Patients/Delete/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            await _db.DeletePatientAsync(id);
            TempData["Success"] = "Patient deleted successfully!";
            return RedirectToAction("Index");
        }

        // GET /Patients/Details/5
        public async Task<IActionResult> Details(int id)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            var patient = await _db.GetPatientByIdAsync(id);
            if (patient == null) return NotFound();

            ViewBag.User = GetCurrentUser();
            return View(patient);
        }

        // GET /Patients/Payment/5
        public async Task<IActionResult> Payment(int id)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            var patient = await _db.GetPatientByIdAsync(id);
            if (patient == null) return NotFound();

            ViewBag.User = GetCurrentUser();
            return View(patient);
        }

        // POST /Patients/AddPayment/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddPayment(int id, decimal amount)
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            if (amount <= 0)
            {
                TempData["Error"] = "Payment amount must be greater than 0.";
                return RedirectToAction("Payment", new { id });
            }

            var newRemaining = await _db.UpdatePaymentAsync(id, amount);
            if (newRemaining == null)
            {
                TempData["Error"] = "Patient not found.";
                return RedirectToAction("Index");
            }

            TempData["Success"] = $"Payment of {amount:C} added. Remaining: {newRemaining:C}";
            return RedirectToAction("Index");
        }
    }
}
