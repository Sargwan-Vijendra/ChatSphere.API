namespace ChatSphere.API.Services.Interfaces;

public interface IOnlineUserTracker
{
    void AddUserToRoom(string roomId, string userId);
    void RemoveUserFromRoom(string roomId, string userId);
    IEnumerable<string> GetOnlineUsersInRoom(string roomId);
    void RemoveUserFromAllRooms(string userId);

    Guid InstanceId { get; }
}

