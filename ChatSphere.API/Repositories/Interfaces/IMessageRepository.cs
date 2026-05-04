using ChatSphere.API.Models.DTOs;

namespace ChatSphere.API.Repositories.Interfaces;

public interface IMessageRepository
{
    // Saves a new message to the database
    Task<long> SaveMessageAsync(Guid roomId, Guid senderId, string content);

    // Retrieves past messages using cursor-based pagination
    Task<IEnumerable<MessageDto>> GetMessagesByRoomAsync(Guid roomId, DateTime? cursor, int limit);

    Guid InstanceId { get; }
}