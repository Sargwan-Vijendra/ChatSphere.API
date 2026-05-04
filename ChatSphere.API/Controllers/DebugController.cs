using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatSphere.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DebugController(
    IMessageFormatter transientService,
    IMessageRepository scopedService,
    IOnlineUserTracker singletonService) : ControllerBase
{
    [HttpGet("di")]
    public IActionResult GetDIDiagnostics()
    {
        // Each of these services will return the ID generated at the moment they were instantiated
        var report = new
        {
            RequestId = HttpContext.TraceIdentifier,
            Transient = new
            {
                Id = transientService.InstanceId,
                Description = "New every time it is requested."
            },
            Scoped = new
            {
                Id = scopedService.InstanceId,
                Description = "Same for this specific HTTP request."
            },
            Singleton = new
            {
                Id = singletonService.InstanceId,
                Description = "Same for the entire lifetime of the app."
            },
            Advice = "Refresh the page: Transient changes, Scoped changes, Singleton stays!"
        };

        return Ok(report);
    }
}