using System;
using System.ComponentModel.DataAnnotations;

namespace HemaSense.Models
{
    public class Patient
    {
        public int PatientId { get; set; }

        [Required(ErrorMessage = "Name is required")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Range(0, 150, ErrorMessage = "Age must be between 0 and 150")]
        public int Age { get; set; }

        [Required]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal TotalPayment { get; set; }

        public decimal Remaining { get; set; }

        public int SecretaryId { get; set; }

        public DateTime? NowDate { get; set; }

        // Computed / Joined fields
        public string? SecretaryName { get; set; }
        public decimal PaidAmount => TotalPayment - Remaining;
    }
}
