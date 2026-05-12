using System.ComponentModel.DataAnnotations;

namespace HemaSense.Models
{
    public class Secretary
    {
        public int SecretaryId { get; set; }
        public string Name { get; set; } = string.Empty;

        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

}
