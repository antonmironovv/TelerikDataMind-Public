using System.ComponentModel.DataAnnotations;

namespace TelerikDataMind.Models
{
    public class RequestViewModel
    {
        public int? UserId { get; set; }

        [StringLength(2000, ErrorMessage = "Prompt must be maximum 2000 characters")]
        [RegularExpression(@"^[a-zA-Z0-9\s\.\,\?\!\-\(\)""\'\;\:]+$", ErrorMessage = "Invalid characters in prompt")]
        public string Prompt { get; set; }

        [Required]
        public string DataFile { get; set; }

        public List<string> SelectedComponents { get; set; }
    }
}
