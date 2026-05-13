using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace HemaSense.Controllers
{
    /// <summary>
    /// Doctor-only admin panel for managing Secretaries and Doctors.
    /// Routes:
    ///   GET  /Admin/Secretaries          – list all secretaries
    ///   POST /Admin/CreateSecretary      – add new secretary
    ///   GET  /Admin/EditSecretary/5      – edit form
    ///   POST /Admin/EditSecretary/5      – save changes
    ///   POST /Admin/DeleteSecretary/5    – delete
    ///   GET  /Admin/Doctors              – list all doctors
    ///   POST /Admin/CreateDoctor         – add new doctor
    ///   GET  /Admin/EditDoctor/5         – edit form
    ///   POST /Admin/EditDoctor/5         – save changes
    ///   POST /Admin/DeleteDoctor/5       – delete
    /// </summary>
    public class AdminController : BaseController
    {
        private readonly DatabaseService _db;

        public AdminController(DatabaseService db) => _db = db;

        // ─────────────────────────────────────────────────────────────
        // SECRETARIES
        // ─────────────────────────────────────────────────────────────

        // GET /Admin/Secretaries
        public async Task<IActionResult> Secretaries()
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            ViewBag.User = GetCurrentUser();
            var secretaries = await _db.GetAllSecretariesAsync();
            return View(secretaries);
        }

        // POST /Admin/CreateSecretary
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateSecretary(Secretary secretary)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            if (string.IsNullOrWhiteSpace(secretary.Name) ||
                string.IsNullOrWhiteSpace(secretary.Username) ||
                string.IsNullOrWhiteSpace(secretary.Password))
            {
                TempData["SecError"] = "All fields are required.";
                return RedirectToAction("Secretaries");
            }

            int newId = await _db.CreateSecretaryAsync(secretary);
            TempData["Success"] = $"Secretary \"{secretary.Name}\" added (ID #{newId}).";
            return RedirectToAction("Secretaries");
        }

        // GET /Admin/EditSecretary/5
        public async Task<IActionResult> EditSecretary(int id)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            var s = await _db.GetSecretaryWithCredsByIdAsync(id);
            if (s == null) return NotFound();

            ViewBag.User = GetCurrentUser();
            return View(s);
        }

        // POST /Admin/EditSecretary/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditSecretary(int id, Secretary secretary)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            secretary.SecretaryId = id;

            if (string.IsNullOrWhiteSpace(secretary.Name) ||
                string.IsNullOrWhiteSpace(secretary.Username) ||
                string.IsNullOrWhiteSpace(secretary.Password))
            {
                ViewBag.User  = GetCurrentUser();
                TempData["SecError"] = "All fields are required.";
                return View(secretary);
            }

            await _db.UpdateSecretaryAsync(secretary);
            TempData["Success"] = $"Secretary \"{secretary.Name}\" updated.";
            return RedirectToAction("Secretaries");
        }

        // POST /Admin/DeleteSecretary/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteSecretary(int id)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            await _db.DeleteSecretaryAsync(id);
            TempData["Success"] = "Secretary deleted.";
            return RedirectToAction("Secretaries");
        }

        // ─────────────────────────────────────────────────────────────
        // DOCTORS
        // ─────────────────────────────────────────────────────────────

        // GET /Admin/Doctors
        public async Task<IActionResult> Doctors()
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            ViewBag.User = GetCurrentUser();
            var doctors = await _db.GetAllDoctorsAsync();
            return View(doctors);
        }

        // POST /Admin/CreateDoctor
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateDoctor(Doctor doctor)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            if (string.IsNullOrWhiteSpace(doctor.Name) ||
                string.IsNullOrWhiteSpace(doctor.Username) ||
                string.IsNullOrWhiteSpace(doctor.Password))
            {
                TempData["DocError"] = "All fields are required.";
                return RedirectToAction("Doctors");
            }

            int newId = await _db.CreateDoctorAsync(doctor);
            TempData["Success"] = $"Doctor \"{doctor.Name}\" added (ID #{newId}).";
            return RedirectToAction("Doctors");
        }

        // GET /Admin/EditDoctor/5
        public async Task<IActionResult> EditDoctor(int id)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            var d = await _db.GetDoctorByIdAsync(id);
            if (d == null) return NotFound();

            ViewBag.User = GetCurrentUser();
            return View(d);
        }

        // POST /Admin/EditDoctor/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditDoctor(int id, Doctor doctor)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            doctor.DoctorId = id;

            if (string.IsNullOrWhiteSpace(doctor.Name) ||
                string.IsNullOrWhiteSpace(doctor.Username) ||
                string.IsNullOrWhiteSpace(doctor.Password))
            {
                ViewBag.User = GetCurrentUser();
                TempData["DocError"] = "All fields are required.";
                return View(doctor);
            }

            await _db.UpdateDoctorAsync(doctor);
            TempData["Success"] = $"Doctor \"{doctor.Name}\" updated.";
            return RedirectToAction("Doctors");
        }

        // POST /Admin/DeleteDoctor/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var auth = RequireDoctor();
            if (auth != null) return auth;

            await _db.DeleteDoctorAsync(id);
            TempData["Success"] = "Doctor deleted.";
            return RedirectToAction("Doctors");
        }
    }
}
