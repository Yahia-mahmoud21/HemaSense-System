using HemaSense.Models;
using HemaSense.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Threading.Tasks;

namespace HemaSense.Controllers
{
    /// <summary>
    /// Base controller that provides session helper methods.
    /// All other controllers that require authentication extend this.
    /// </summary>
    public abstract class BaseController : Controller
    {
        protected SessionUser? GetCurrentUser()
        {
            var json = HttpContext.Session.GetString("UserJson");
            if (string.IsNullOrEmpty(json)) return null;
            return JsonSerializer.Deserialize<SessionUser>(json);
        }

        protected IActionResult RequireAuth()
        {
            var user = GetCurrentUser();
            if (user == null)
                return RedirectToAction("Login", "Account");
            return null!;
        }

        protected IActionResult RequireDoctor()
        {
            var user = GetCurrentUser();
            if (user == null)
                return RedirectToAction("Login", "Account");
            if (user.Role != "doctor")
                return Forbid();
            return null!;
        }
    }
}
