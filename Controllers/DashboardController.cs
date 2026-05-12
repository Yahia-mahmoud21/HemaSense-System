using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace HemaSense.Controllers
{
    public class DashboardController : BaseController
    {
        private readonly DatabaseService _db;

        public DashboardController(DatabaseService db) => _db = db;

        // GET /Dashboard
        public async Task<IActionResult> Index()
        {
            var auth = RequireAuth();
            if (auth != null) return auth;

            var user = GetCurrentUser()!;
            var stats = await _db.GetDashboardStatsAsync();
            var patients = await _db.GetAllPatientsAsync();

            ViewBag.User = user;
            ViewBag.Stats = stats;
            ViewBag.LatestPatients = patients;
            return View();
        }
    }
}
