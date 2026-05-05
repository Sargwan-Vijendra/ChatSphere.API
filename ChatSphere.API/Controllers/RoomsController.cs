using ChatSphere.API.Models;
using ChatSphere.API.Models.DTOs;
using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChatSphere.API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly IRoomRepository _roomRepository;
        private readonly IOnlineUserTracker _tracker; 


        public RoomsController(IRoomRepository roomRepository, IOnlineUserTracker tracker)
        {
            _roomRepository = roomRepository;
            _tracker = tracker;

        }

        [HttpPost("CreateRoom")]
        [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
        public async Task<IActionResult> CreateRoom([FromBody] createRoomRequest request)
        {
            var userId = GetUserId();
            var roomId = await _roomRepository.CreateRoomAsync(request, userId);

            return CreatedAtAction(nameof(GetRoomById), new { id = roomId }, roomId);
        }

        [HttpGet("RoomsList")]
        public async Task<IActionResult> GetMyRooms()
        {
            var userId = GetUserId();
            var rooms = await _roomRepository.GetRoomsListAsync(userId);
            return Ok(rooms);
        }

        [HttpGet("GetRoomDetail/{id}")]
        public async Task<IActionResult> GetRoomById(Guid id)
        {
            try
            {
                var room = await _roomRepository.GetRoomDetailAsyn(id);
                return Ok(room);
            }
            catch (KeyNotFoundException)
            {
                return NotFound($"Room with ID {id} not found.");
            }
        }

        [HttpPost("join")]
        public async Task<IActionResult> JoinRoom([FromBody] joinRoomRequest request)
        {
            var userId = GetUserId();
            var success = await _roomRepository.JoinRoomAsync(request, userId);

            return success ? Ok("Joined successfully.") : BadRequest("Already a member or room not found.");
        }

        [HttpPost("leave")]
        public async Task<IActionResult> LeaveRoom([FromBody] leftRoomRequest request)
        {
            var userId = GetUserId();
            var success = await _roomRepository.LeftRoomAsync(request, userId);

            return success ? NoContent() : NotFound("Member record not found.");
        }

        [HttpDelete("DeleteRoom/{id}")]
        public async Task<IActionResult> DeleteRoom(Guid id)
        {
            var success = await _roomRepository.DeleteRoomAsync(id);
            return success ? NoContent() : NotFound();
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User ID not found in token.");
            }
            return userId;
        }

        [HttpGet("{roomId}/online")]
        public IActionResult GetOnlineUsers(string roomId)
        {
            // Fetch directly from memory - super fast, no SQL involved![cite: 2]
            var users = _tracker.GetOnlineUsersInRoom(roomId);
            return Ok(users);
        }
    }
}