using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Threading.Tasks;

namespace HemaSense.Controllers
{
    /// <summary>
    /// Handles all authentication routes:
    ///   GET  /Account/Login
    ///   POST /Account/Login
    ///   POST /Account/Logout
    /// </summary>
    public class AccountController : Controller
    {
        private readonly DatabaseService _db;

        public AccountController(DatabaseService db) => _db = db;

        // GET /Account/Login  or  GET /Account/Login?role=doctor
        [HttpGet]
        public IActionResult Login(string role = "secretary")
        {
            if (HttpContext.Session.GetString("UserJson") != null)
                return RedirectToAction("Index", "Dashboard");

            var model = new LoginViewModel { Role = role };
            return View(model);
        }

        // POST /Account/Login
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            SessionUser? sessionUser = null;

            if (model.Role == "doctor")
            {
                var doctor = await _db.AuthenticateDoctorAsync(model.Username, model.Password);
                if (doctor != null)
                {
                    sessionUser = new SessionUser
                    {
                        UserId = doctor.DoctorId,
                        Name = doctor.Name,
                        Role = "doctor"
                    };
                }
            }
            else
            {
                var secretary = await _db.AuthenticateSecretaryAsync(model.Username, model.Password);
                if (secretary != null)
                {
                    sessionUser = new SessionUser
                    {
                        UserId = secretary.SecretaryId,
                        Name = secretary.Name,
                        Role = "secretary"
                    };
                }
            }

            if (sessionUser == null)
            {
                ModelState.AddModelError(string.Empty, "Invalid username or password");
                return View(model);
            }

            HttpContext.Session.SetString("UserJson", JsonSerializer.Serialize(sessionUser));

            if (sessionUser.Role == "doctor")
                return RedirectToAction("Pending", "Reports");

            return RedirectToAction("Index", "Dashboard");
        }

        // POST /Account/Logout
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }

        // GET /Account/Home
        [HttpGet]
        public IActionResult Home() => View();
    }
}
