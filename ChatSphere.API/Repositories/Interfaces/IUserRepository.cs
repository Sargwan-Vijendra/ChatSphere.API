namespace ChatSphere.API.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<Guid?> CreateUserAsync(string username, string email, string passwordHash, string? displayName);
        Task<(Guid UserId, string PasswordHash, string Username, string Email)?> GetUserByUsernameAsync(string username);
    }
}
