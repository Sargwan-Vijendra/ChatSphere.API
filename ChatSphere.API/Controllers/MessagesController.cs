using ChatSphere.API.Hubs;
using ChatSphere.API.Models.DTOs;
using ChatSphere.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace ChatSphere.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MessagesController(IMessageRepository messageRepo, Microsoft.AspNetCore.SignalR.IHubContext<ChatHub> hubContext) : ControllerBase
{
 
    [HttpGet("{roomId}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<MessageDto>))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetChatHistory(
        Guid roomId,
        [FromQuery] DateTime? cursor,
        [FromQuery] int limit = 50)
    {
        // 1. Basic validation of parameters
        if (limit <= 0 || limit > 100) limit = 50;

        try
        {
            // 2. Fetch from the Scoped Repository using ADO.NET logic
            var messages = await messageRepo.GetMessagesByRoomAsync(roomId, cursor, limit);

            // 3. Return the historical data
            return Ok(messages);
        }
        catch (Exception ex)
        {
            // In a real app, log the exception (ex)
            return BadRequest(new { message = "Could not retrieve message history." });
        }
    }

    [HttpPost("Send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        // Fix: Username claim ko properly handle karein
        var username = User.Identity?.Name ?? "Unknown";

        if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized();

        var userId = Guid.Parse(userIdClaim);

        try
        {
            await messageRepo.SaveMessageAsync(request.RoomId, userId, username, request.Content);

            // FIX: Ek anonymous object bhejein, na ki positional arguments
            await hubContext.Clients.Group(request.RoomId.ToString())
                .SendAsync("ReceiveMessage", new
                {
                    roomId = request.RoomId.ToString(),
                    senderName = username,
                    content = request.Content,
                    timestamp = DateTime.UtcNow.ToString("o")
                });

            return Ok();
        }
        catch (Exception)
        {
            return BadRequest("Failed to send message.");
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

}