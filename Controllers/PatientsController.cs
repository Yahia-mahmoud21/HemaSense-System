using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
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
