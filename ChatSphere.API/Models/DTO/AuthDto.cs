namespace ChatSphere.API.Models.DTOs
{
    // Move records OUT of the AuthDto class
    public record RegisterRequest(
        string Username,
        string Email,
        string Password,
        string? DisplayName);

    public record LoginRequest(string Username, string Password);

    public record AuthResponse(
        string Token,
        Guid UserId,
        string Username,
        int ExpiresIn);
}
