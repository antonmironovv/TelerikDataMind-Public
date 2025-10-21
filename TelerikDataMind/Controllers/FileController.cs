using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using TelerikDataMind.Models;
using TelerikDataMind.Services;

namespace TelerikDataMind.Controllers
{
    public class FileController : Controller
    {
        private readonly OpenAIService _aiService;

        public FileController(OpenAIService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost]
        public async Task<ActionResult> Save(IFormFile DataFile)
        {
            // The Name of the Upload component is "DataFile"
            if (DataFile != null)
            {
                var fileContent = ContentDispositionHeaderValue.Parse(DataFile.ContentDisposition);

                // Some browsers send file names with full path.
                // We are only interested in the file name.
                var fileName = Path.GetFileName(fileContent.FileName.ToString().Trim('"'));
                var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);

                using (var fileStream = new FileStream(physicalPath, FileMode.Create))
                {
                    await DataFile.CopyToAsync(fileStream);
                }
            }

            // Return an empty string to signify success
            return Content("");
        }

        [HttpPost]
        public IActionResult Remove(string[] fileNames)
        {
            // The parameter of the Remove action must be called "fileNames"
            if (fileNames != null)
            {
                foreach (var fullName in fileNames)
                {
                    var fileName = Path.GetFileName(fullName);
                    var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", fileName);

                    if (System.IO.File.Exists(physicalPath))
                    {
                         System.IO.File.Delete(physicalPath);
                    }
                }
            }

            // Return an empty string to signify success
            return Content("");
        }

        [HttpPost]
        public async Task<IActionResult> AnalyzeJson([FromBody] JsonAnalyzeRequest request)
        {
            if (request?.JsonData == null || request.JsonData.Count == 0)
                return BadRequest();

            // Validate model
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(string.Join(", ", errors));
            }

            var limitedData = request.JsonData
                //.Take(100)
                .ToList();
            var headers = limitedData.First().Keys.ToList();
            var rows = limitedData.Select(r => string.Join(", ", r.Values)).ToList();
            var requirements = "";

            //Append prompt details
            if (!String.IsNullOrEmpty(request.prompt))
            {
                // Sanitize the prompt server-side (defense in depth)
                var sanitizedPrompt = SanitizePrompt(request.prompt);
                requirements += "Requirements:\n" + sanitizedPrompt;
            }

            //Append specified components
            if (request.components.Count > 0)
            {
                requirements += "\nUse Components: " + string.Join(", ", request.components);
            }

            var tableText =
                "Headers: " + string.Join(", ", headers) +
                "\nSample rows:\n" + string.Join("\n", rows);

            var promptPath = Path.Combine(Directory.GetCurrentDirectory(), "Services", "DataAnalysisPrompt.txt");
            var promptTemplate = await System.IO.File.ReadAllTextAsync(promptPath);
            var fullPrompt = promptTemplate.Replace("{tableText}", tableText).Replace("{requirements}", requirements);

            var aiResponse = await _aiService.AskAsync(fullPrompt);

            try
            {
                var cleanResponse = Regex.Replace(aiResponse, @"^```[a-z]*|```$", "", RegexOptions.Multiline).Trim();
                return Content(cleanResponse, "application/json");
            }
            catch
            {
                return Json(new { summary = new[] { "AI returned invalid JSON." } });
            }
        }

        private string SanitizePrompt(string prompt)
        {
            if (string.IsNullOrWhiteSpace(prompt))
                return string.Empty;

            // Remove HTML tags
            prompt = Regex.Replace(prompt, "<.*?>", string.Empty);

            // Remove script-like content
            prompt = Regex.Replace(prompt, @"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
                                  string.Empty, RegexOptions.IgnoreCase);

            // Remove potentially dangerous characters but keep AI-friendly punctuation
            prompt = Regex.Replace(prompt, @"[<>""'&]", string.Empty);

            // Allow only safe characters for AI prompts
            prompt = Regex.Replace(prompt, @"[^a-zA-Z0-9\s\.\,\?\!\-\(\)]", string.Empty);

            // Normalize whitespace
            prompt = Regex.Replace(prompt, @"\s+", " ").Trim();

            // HTML encode for additional safety
            prompt = WebUtility.HtmlEncode(prompt);

            return prompt;
        }
    }
}
