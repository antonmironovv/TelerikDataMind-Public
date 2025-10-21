namespace TelerikDataMind.Models
{
    public class JsonAnalyzeRequest
    {
        public string prompt { get; set; }
        public List<string> components { get; set; }
        public string fileName { get; set; }
        public List<Dictionary<string, object>> JsonData { get; set; }
    }
}
