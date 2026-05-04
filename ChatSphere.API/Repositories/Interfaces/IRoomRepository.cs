using ChatSphere.API.Models.DTOs;

namespace ChatSphere.API.Repositories.Interfaces
{
    public interface IRoomRepository
    {
        Task<Guid> CreateRoomAsync(createRoomRequest request, Guid UserId);
        Task<RoomDetail> GetRoomDetailAsyn(Guid roomId);
        Task<bool> DeleteRoomAsync(Guid roomId);
        Task<IEnumerable<listRoomRequest>> GetRoomsListAsync(Guid UserId);
        Task<bool> JoinRoomAsync(joinRoomRequest request, Guid UserId);
        Task<bool> LeftRoomAsync(leftRoomRequest request, Guid UserId);

    }
}
