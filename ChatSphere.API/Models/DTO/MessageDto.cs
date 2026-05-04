namespace ChatSphere.API.Models.DTOs;

/// <summary>
/// Data Transfer Object for sending message details to the client.
/// </summary>
/// <param name="MessageId">The unique ID from the database.</param>
/// <param name="Content">The formatted chat text.</param>
/// <param name="Timestamp">When the message was sent (UTC).</param>
/// <param name="Username">The sender's unique username.</param>
/// <param name="DisplayName">The sender's optional friendly name.</param>
public record MessageDto(
    long MessageId,
    string Content,
    DateTime Timestamp,
    string Username,
    string? DisplayName);