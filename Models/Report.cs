using System;
using System.ComponentModel.DataAnnotations;

namespace HemaSense.Models
{
    public class Report
    {
        public int ReportId { get; set; }

        [Required]
        public int PatientId { get; set; }

        [Required]
        [Range(0, 100, ErrorMessage = "WBC must be between 0 and 100")]
        public double WBC { get; set; }

        [Required]
        [Range(0, 20, ErrorMessage = "RBC must be between 0 and 20")]
        public double RBC { get; set; }

        [Required]
        [Range(0, 25, ErrorMessage = "HGB must be between 0 and 25")]
        public double HGB { get; set; }

        [Required]
        [Range(0, 100, ErrorMessage = "HCT must be between 0 and 100")]
        public double HCT { get; set; }

        [Required]
        [Range(0, 200, ErrorMessage = "MCV must be between 0 and 200")]
        public double MCV { get; set; }

        [Required]
        [Range(0, 100, ErrorMessage = "MCH must be between 0 and 100")]
        public double MCH { get; set; }

        [Required]
        [Range(0, 50, ErrorMessage = "MCHC must be between 0 and 50")]
        public double MCHC { get; set; }

        [Required]
        [Range(0, 2000, ErrorMessage = "PLT must be between 0 and 2000")]
        public double PLT { get; set; }

        [Required]
        [StringLength(200)]
        public string Diagnosis { get; set; } = string.Empty;

        // Joined fields from Patient
        public string? PatientName { get; set; }
        public int PatientAge { get; set; }
        public string? PatientPhone { get; set; }
        public DateTime? PatientDate { get; set; }
    }
}
