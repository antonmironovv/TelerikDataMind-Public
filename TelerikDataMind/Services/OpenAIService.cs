using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.Extensions.Configuration;

namespace TelerikDataMind.Services
{
    public class OpenAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public OpenAIService(IConfiguration configuration)
        {
            _config = configuration;
            _httpClient = new HttpClient();
        }

        public async Task<string> AskAsync(string question)
        {
            var useAzure = _config.GetValue<bool>("OpenAI:UseAzure");
            return useAzure ? await AskAzureAsync(question) : await AskOpenAIAsync(question);
        }

        private async Task<string> AskAzureAsync(string question)
        {
            var endpoint = _config["OpenAI:Endpoint"];
            var apiKey = _config["OpenAI:ApiKey"];
            var deployment = _config["OpenAI:DeploymentName"];
            var url = $"{endpoint}openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview";

            var payload = new
            {
                messages = new[]
                {
                    new { role = "system", content = "You are a professional data visualization assistant." },
                    new { role = "user", content = question }
                },
                temperature = 0.3,
                max_tokens = 1500
            };

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("api-key", apiKey);

            var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);
            var text = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return $"{{\"summary\": [\"Azure OpenAI API error: {response.StatusCode}\"], \"chart\": {{}}, \"widgets\": []}}";

            var json = JObject.Parse(text);
            return json["choices"]?[0]?["message"]?["content"]?.ToString()?.Trim() ?? "";
        }

        private async Task<string> AskOpenAIAsync(string question)
        {
            var apiKey = _config["OpenAI:ApiKey"];
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var payload = new
            {
                model = "gpt-3.5-turbo",
                messages = new[]
                {
                    new { role = "system", content = "You are a professional data visualization assistant." },
                    new { role = "user", content = question }
                },
                temperature = 0.3,
                max_tokens = 1500
            };

            var content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
            var text = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return $"{{\"summary\": [\"OpenAI API error: {response.StatusCode}\"], \"chart\": {{}}, \"widgets\": []}}";

            var json = JObject.Parse(text);
            return json["choices"]?[0]?["message"]?["content"]?.ToString()?.Trim() ?? "";
        }
    }
}
