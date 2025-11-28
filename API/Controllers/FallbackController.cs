using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

public class FallbackController : Controller
{
    public IActionResult Index()
    {
        var indexPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html");
        if (System.IO.File.Exists(indexPath))
        {
            return PhysicalFile(indexPath, "text/html");
        }
        
        // If index.html doesn't exist, return a simple response
        // This happens in development when the Angular app is served separately
        return Content("Angular app should be served from the client development server", "text/plain");
    }
}
