using ChatSphere.API.Models.DTOs;
using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatSphere.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(
    IUserRepository repo,
    IPasswordHasher hasher,
    ITokenService tokenService) : ControllerBase
    {
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // 1. Hash the password using the Transient service
            var hash = hasher.HashPassword(request.Password);

            // 2. Save to SQL using the Scoped repository
            var userId = await repo.CreateUserAsync(
                request.Username,
                request.Email,
                hash,
                request.DisplayName);

            if (userId == null)
            {
                return BadRequest(new { message = "Registration failed. Username or Email may already exist." });
            }

            // 3. Generate token using the Singleton service[cite: 1]
            var token = tokenService.GenerateToken(userId.Value, request.Username, request.Email);

            return CreatedAtAction(nameof(Register), new AuthResponse(
                token,
                userId.Value,
                request.Username,
                3600));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // 1. Fetch user by username[cite: 1]
            var user = await repo.GetUserByUsernameAsync(request.Username);

            // 2. Verify password[cite: 1]
            if (user == null || !hasher.VerifyPassword(request.Password, user.Value.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            // 3. Issue JWT[cite: 1]
            var token = tokenService.GenerateToken(user.Value.UserId, user.Value.Username, user.Value.Email);

            return Ok(new AuthResponse(
                token,
                user.Value.UserId,
                user.Value.Username,
                3600));
        }
    }
}
