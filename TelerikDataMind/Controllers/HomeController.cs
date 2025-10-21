using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TelerikDataMind.Models;


namespace TelerikDataMind.Controllers
{
    public class HomeController : Controller
    {

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            if (!string.IsNullOrEmpty(context.HttpContext.Request.Query["culture"]))
            {
                CultureInfo.DefaultThreadCurrentCulture = CultureInfo.DefaultThreadCurrentUICulture = new CultureInfo(context.HttpContext.Request.Query["culture"]);
            }
            base.OnActionExecuting(context);
        }

        public IActionResult Index()
        {
            return View(new RequestViewModel());
        }

        public IActionResult About()
        {
            return View();
        }

        public IActionResult Description()
        {
            return View();
        }

        public IActionResult Error()
        {
            return View();
        }
    }
}
