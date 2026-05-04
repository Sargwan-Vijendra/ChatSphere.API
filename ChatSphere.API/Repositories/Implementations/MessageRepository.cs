using Microsoft.Data.SqlClient;
using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Models.DTOs;
using System.Data;

namespace ChatSphere.API.Repositories;

public class MessageRepository(IConfiguration config) : IMessageRepository
{
    private readonly string _connectionString = config.GetConnectionString("DefaultConnection")!;

    public Guid InstanceId { get; } = Guid.NewGuid();
    public async Task<long> SaveMessageAsync(Guid roomId, Guid senderId, string content)
    {
        using var conn = new SqlConnection(_connectionString);
        // Use OUTPUT to get the Identity ID and ensure the timestamp is captured
        const string sql = @"
            INSERT INTO dbo.Messages (RoomId, SenderId, Content)
            OUTPUT inserted.MessageId
            VALUES (@RoomId, @SenderId, @Content)";

        using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@RoomId", roomId);
        cmd.Parameters.AddWithValue("@SenderId", senderId);
        cmd.Parameters.AddWithValue("@Content", content);

        await conn.OpenAsync();
        return (long)await cmd.ExecuteScalarAsync();
    }

    public async Task<IEnumerable<MessageDto>> GetMessagesByRoomAsync(Guid roomId, DateTime? cursor, int limit)
    {
        var messages = new List<MessageDto>();
        using var conn = new SqlConnection(_connectionString);

        // Logic: If cursor is null, get latest. If cursor exists, get messages older than cursor.
        string sql = @"
            SELECT TOP (@Limit) m.MessageId, m.Content, m.Timestamp, u.Username, u.DisplayName
            FROM dbo.Messages m
            JOIN dbo.Users u ON m.SenderId = u.UserId
            WHERE m.RoomId = @RoomId "
            + (cursor.HasValue ? "AND m.Timestamp < @Cursor " : "") +
            "ORDER BY m.Timestamp DESC";

        using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@RoomId", roomId);
        cmd.Parameters.AddWithValue("@Limit", limit);
        if (cursor.HasValue) cmd.Parameters.AddWithValue("@Cursor", cursor.Value);

        await conn.OpenAsync();
        using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            messages.Add(new MessageDto(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetDateTime(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4)
            ));
        }

        return messages;
    }
}