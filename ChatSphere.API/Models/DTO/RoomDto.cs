namespace ChatSphere.API.Models.DTOs
{
    public record createRoomRequest(string name, string description, bool isPrivate);
    public record listRoomRequest(Guid roomId, string name, string description, string AccessType, string createdBy, string Role);
    public record joinRoomRequest(string roomId, string role);
    public record leftRoomRequest(string roomId);
    public record RoomDetail(string roomName, string Description, string AccessType, string createdBy);
}
