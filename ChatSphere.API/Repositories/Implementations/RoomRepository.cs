using ChatSphere.API.Models;
using ChatSphere.API.Models.DTOs;
using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Services.Interfaces;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ChatSphere.API.Repositories.Implementations
{
    public class RoomRepository : IRoomRepository
    {
        private readonly IDbConnnectionFactory _connnectionFactory;

        public RoomRepository(IDbConnnectionFactory dbConnnection)
        {
            _connnectionFactory = dbConnnection;
        }

        public async Task<Guid> CreateRoomAsync(createRoomRequest request, Guid userId)
        {
            await using var conn = _connnectionFactory.CreateConnection();
            await conn.OpenAsync();

            await using var transaction = await Task.Run(() => conn.BeginTransaction());

            try
            {
                var roomQuery = @"INSERT INTO Rooms (Name, Description, IsPrivate, CreatedByUserId) 
                                  OUTPUT inserted.RoomId
                                  VALUES (@Name, @Description, @IsPrivate, @CreatedBy);";

                await using var roomCmd = new SqlCommand(roomQuery, conn, (SqlTransaction)transaction);
                roomCmd.Parameters.AddWithValue("@Name", request.name);
                roomCmd.Parameters.AddWithValue("@Description", request.description ?? (object)DBNull.Value);
                roomCmd.Parameters.AddWithValue("@IsPrivate", request.isPrivate);
                roomCmd.Parameters.AddWithValue("@CreatedBy", userId); 

                var result = await roomCmd.ExecuteScalarAsync();
                if (result == null) throw new Exception("Room creation failed.");

                Guid newRoomId = (Guid)result;

                // 2. Automatically Join Creator as Admin
                var memberQuery = @"INSERT INTO RoomMembers (RoomId, UserId, Role, JoinedAt) 
                                    VALUES (@RoomId, @UserId, 'Admin', @JoinedAt);";

                await using var memberCmd = new SqlCommand(memberQuery, conn, (SqlTransaction)transaction);
                memberCmd.Parameters.AddWithValue("@RoomId", newRoomId);
                memberCmd.Parameters.AddWithValue("@UserId", userId); 
                memberCmd.Parameters.AddWithValue("@JoinedAt", DateTime.UtcNow);

                await memberCmd.ExecuteNonQueryAsync();

                await transaction.CommitAsync();
                return newRoomId;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<RoomDetail> GetRoomDetailAsyn(Guid roomId)
        {
            await using var conn = _connnectionFactory.CreateConnection();

            const string query = @"SELECT rm.Name, rm.Description,
                                  CASE 
                                    WHEN rm.IsPrivate = 1 THEN 'Private' 
                                    WHEN rm.IsPrivate = 0 THEN 'Public'
                                    ELSE 'Undefined'
                                  END AS AccessType,
                                  Us.Username 
                                  FROM Rooms rm
                                  LEFT JOIN Users Us ON rm.CreatedByUserId = Us.UserId
                                  WHERE rm.RoomId = @RoomId AND rm.IsActive = 1";

            await using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoomId", roomId);

            await conn.OpenAsync();
            await using var reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new RoomDetail(
                    reader.GetString(0),
                    reader.IsDBNull(1) ? string.Empty : reader.GetString(1), 
                    reader.GetString(2), 
                    reader.IsDBNull(3) ? "Unknown" : reader.GetString(3)  
                );
            }

            throw new KeyNotFoundException("Room not found.");
        }

        public async Task<bool> DeleteRoomAsync(Guid roomId)
        {
            await using var conn = _connnectionFactory.CreateConnection();
            const string query = "UPDATE Rooms SET IsActive = 0 WHERE RoomId = @RoomId AND IsActive = 1";

            await using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoomId", roomId);

            await conn.OpenAsync();
            return await cmd.ExecuteNonQueryAsync() > 0;
        }

        public async Task<IEnumerable<listRoomRequest>> GetRoomsListAsync(Guid userId)
        {
            var rooms = new List<listRoomRequest>();
            const string query = @"
                SELECT RM.Name, RM.Description,
                CASE 
                    WHEN RM.IsPrivate = 1 THEN 'Private'
                    WHEN RM.IsPrivate = 0 THEN 'Public'
                    ELSE 'Undefined'
                END AS AccessType,
                Us.Username,
                Members.Role
                FROM Rooms RM
                INNER JOIN RoomMembers Members ON Members.RoomId = RM.RoomId
                LEFT JOIN Users Us ON Us.UserId = RM.CreatedByUserId
                WHERE Members.UserId = @UserId AND RM.IsActive = 1";

            await using var conn = _connnectionFactory.CreateConnection();
            await using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@UserId", userId);

            await conn.OpenAsync();
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                rooms.Add(new listRoomRequest(
                    reader.GetString(0),
                    reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    reader.GetString(2),
                    reader.IsDBNull(3) ? "Unknown" : reader.GetString(3),
                    reader.GetString(4)
                ));
            }
            return rooms;
        }

        public async Task<bool> JoinRoomAsync(joinRoomRequest request, Guid userId)
        {
            await using var conn = _connnectionFactory.CreateConnection();
            const string query = @"IF NOT EXISTS (SELECT 1 FROM RoomMembers WHERE RoomId = @RoomId AND UserId = @UserId)
                                  INSERT INTO RoomMembers (RoomId, UserId, Role, JoinedAt) 
                                  VALUES (@RoomId, @UserId, @Role, @JoinedAt)";

            await using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@RoomId", request.roomId);
            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.Parameters.AddWithValue("@Role", request.role);
            cmd.Parameters.AddWithValue("@JoinedAt", DateTime.UtcNow);

            await conn.OpenAsync();
            return await cmd.ExecuteNonQueryAsync() > 0;
        }

        public async Task<bool> LeftRoomAsync(leftRoomRequest request, Guid userId)
        {
            const string query = @"UPDATE RoomMembers SET LeftAt = @UTCDate 
                                  WHERE RoomId = @RoomId AND UserId = @UserId AND LeftAt IS NULL";

            await using var conn = _connnectionFactory.CreateConnection();
            await using var cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@UTCDate", DateTime.UtcNow);
            cmd.Parameters.AddWithValue("@RoomId", request.roomId);
            cmd.Parameters.AddWithValue("@UserId", userId);

            await conn.OpenAsync();
            return await cmd.ExecuteNonQueryAsync() > 0;
        }
    }
}