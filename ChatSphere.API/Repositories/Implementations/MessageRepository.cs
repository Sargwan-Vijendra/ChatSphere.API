using ChatSphere.API.Models.DTOs;
using ChatSphere.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Connections;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ChatSphere.API.Repositories;

public class MessageRepository(IConfiguration config) : IMessageRepository
{
    private readonly string _connectionString = config.GetConnectionString("DefaultConnection")!;

    public Guid InstanceId { get; } = Guid.NewGuid();

    public async Task<MessageDto> SaveMessageAsync(Guid roomId, Guid userId, string username, string content)
    {
        const string query = @"
        INSERT INTO Messages (RoomId, SenderId, Content, Timestamp)
        VALUES (@RoomId, @SenderId, @Content, @Timestamp);
        SELECT CAST(SCOPE_IDENTITY() as BIGINT);"; // Identity ko BIGINT mein cast karein

        var timestamp = DateTime.UtcNow;

        using var conn = new SqlConnection(_connectionString);
        await using var cmd = new SqlCommand(query, conn);
        // ... parameters (RoomId, SenderId, Content, Timestamp)
        cmd.Parameters.AddWithValue("@RoomId", roomId);
        cmd.Parameters.AddWithValue("@SenderId", userId);
        cmd.Parameters.AddWithValue("@Content", content);
        cmd.Parameters.AddWithValue("@Timestamp", timestamp);

        await conn.OpenAsync();

        // ERROR FIX: ExecuteScalar object return karta hai, use long mein convert karein
        var result = await cmd.ExecuteScalarAsync();
        long generatedId = Convert.ToInt64(result);

        // ERROR FIX: Saare 5 arguments provider karein jo record demand kar raha hai
        return new MessageDto(
            generatedId,   // MessageId (long)
            content,       // Content (string)
            timestamp,     // Timestamp (DateTime)
            username,      // Username (string)
            username           // DisplayName (string?)
        );
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
            "ORDER BY m.Timestamp ASC";

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
                reader.IsDBNull(2) ? DateTime.MinValue : reader.GetDateTime(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4)
            ));
        }

        return messages;
    }
}