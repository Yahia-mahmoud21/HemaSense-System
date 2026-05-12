using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HemaSense.Models
{
    public class LoginViewModel
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        /// <summary>doctor or secretary</summary>
        public string Role { get; set; } = "secretary";
    }

    public class DashboardStats
    {
        public int TotalPatients { get; set; }
        public int TotalReports { get; set; }
        public int PendingReports { get; set; }
    }

    public class PaymentRequest
    {
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Payment must be greater than 0")]
        public decimal Amount { get; set; }
    }

    public class PredictRequest
    {
        [JsonPropertyName("WBC")]
        public double WBC { get; set; }
        [JsonPropertyName("RBC")]
        public double RBC { get; set; }
        [JsonPropertyName("HGB")]
        public double HGB { get; set; }
        [JsonPropertyName("HCT")]
        public double HCT { get; set; }
        [JsonPropertyName("MCV")]
        public double MCV { get; set; }
        [JsonPropertyName("MCH")]
        public double MCH { get; set; }
        [JsonPropertyName("MCHC")]
        public double MCHC { get; set; }
        [JsonPropertyName("PLT")]
        public double PLT { get; set; }
    }

    public class SessionUser
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
