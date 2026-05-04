using System.Collections.Concurrent;
using ChatSphere.API.Services.Interfaces;

namespace ChatSphere.API.Services.Implementations;

public class OnlineUserTracker : IOnlineUserTracker
{
    // Maps RoomId -> HashSet of UserIds
    private readonly ConcurrentDictionary<string, HashSet<string>> _roomOccupants = new();

    public Guid InstanceId { get; } = Guid.NewGuid();
    public void AddUserToRoom(string roomId, string userId)
    {
        _roomOccupants.AddOrUpdate(roomId,
            _ => new HashSet<string> { userId },
            (_, users) => {
                lock (users) { users.Add(userId); }
                return users;
            });
    }

    public void RemoveUserFromRoom(string roomId, string userId)
    {
        if (_roomOccupants.TryGetValue(roomId, out var users))
        {
            lock (users) { users.Remove(userId); }
        }
    }

    public IEnumerable<string> GetOnlineUsersInRoom(string roomId)
    {
        if (_roomOccupants.TryGetValue(roomId, out var users))
        {
            lock (users) { return users.ToList(); }
        }
        return Enumerable.Empty<string>();
    }

    public void RemoveUserFromAllRooms(string userId)
    {
        foreach (var room in _roomOccupants)
        {
            lock (room.Value) { room.Value.Remove(userId); }
        }
    }
}