using ChatSphere.API.Repositories.Interfaces;
using Microsoft.Data.SqlClient;

namespace ChatSphere.API.Repositories.Implementations
{
    public class UserRepository(IConfiguration config) : IUserRepository
    {
        private readonly string _connectionString = config.GetConnectionString("DefaultConnection")!;

        public async Task<Guid?> CreateUserAsync(string username, string email, string passwordHash, string? displayName)
        {
            using var conn = new SqlConnection(_connectionString);
            const string sql = @"
            INSERT INTO dbo.Users (Username, Email, PasswordHash, DisplayName)
            OUTPUT inserted.UserId
            VALUES (@Username, @Email, @PasswordHash, @DisplayName)";

            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Username", username);
            cmd.Parameters.AddWithValue("@Email", email);
            cmd.Parameters.AddWithValue("@PasswordHash", passwordHash);
            cmd.Parameters.AddWithValue("@DisplayName", (object?)displayName ?? DBNull.Value);

            await conn.OpenAsync();
            return (Guid?)await cmd.ExecuteScalarAsync();
        }

        public async Task<(Guid UserId, string PasswordHash, string Username, string Email)?> GetUserByUsernameAsync(string username)
        {
            using var conn = new SqlConnection(_connectionString);
            const string sql = "SELECT UserId, PasswordHash, Username, Email FROM dbo.Users WHERE Username = @Username AND IsActive = 1";

            using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Username", username);

            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return (
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetString(3)
                );
            }
            return null;
        }
    }
}
