using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace ChatSphere.API.Hubs;

[Authorize] // Ensures only logged-in users with a valid JWT can connect
public class ChatHub : Hub
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMessageFormatter _formatter;
    private readonly IOnlineUserTracker _tracker; // Singleton is safe to inject
    // Note: Presence Tracker is Singleton, so it is safe to inject directly
    // private readonly IOnlineUserTracker _tracker; 

    public ChatHub(IServiceScopeFactory scopeFactory, IMessageFormatter formatter, IOnlineUserTracker tracker)
    {
        _scopeFactory = scopeFactory;
        _formatter = formatter;
        _tracker = tracker;
    }

    public override async Task OnConnectedAsync()
    {
        // On initial connection, we don't know the room yet. 
        // We just log that the connection was successful.
        await base.OnConnectedAsync();
    }

    public async Task JoinRoom(string roomId)
    {
        var userId = Context.UserIdentifier; // From JWT

        if (!string.IsNullOrEmpty(userId))
        {
            // 1. Add to SignalR Group for message broadcasting
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // 2. Update the Singleton Presence Tracker
            _tracker.AddUserToRoom(roomId, userId);

            // 3. Notify others in the room that someone joined
            await Clients.Group(roomId).SendAsync("UserJoined", new
            {
                UserId = userId,
                Username = Context.User?.Identity?.Name
            });
        }
    }

    public async Task LeaveRoom(string roomId)
    {
        var userId = Context.UserIdentifier;

        if (!string.IsNullOrEmpty(userId))
        {
            // 1. Remove from SignalR Group
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

            // 2. Remove from Presence Tracker[cite: 2]
            _tracker.RemoveUserFromRoom(roomId, userId);

            // 3. Notify others[cite: 2]
            await Clients.Group(roomId).SendAsync("UserLeft", userId);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;

        if (!string.IsNullOrEmpty(userId))
        {
            // 1. Global Cleanup: Remove user from all tracked rooms[cite: 2]
            _tracker.RemoveUserFromAllRooms(userId);

            // 2. Broadcast disconnection (Optional: Usually handled per room in the UI)
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string roomId, string message)
    {
        if (!Guid.TryParse(roomId, out var roomGuid)) return;

        // 1. Format the message using the Transient service[cite: 2]
        var formattedMessage = _formatter.Format(message);
        var userId = Guid.Parse(Context.UserIdentifier!); // Captured from JWT[cite: 2]
        var username = Context.User?.Identity?.Name ?? "Unknown";

        // 2. Create a manual scope to use the Scoped Repository[cite: 2]
        using (var scope = _scopeFactory.CreateScope())
        {
            var repo = scope.ServiceProvider.GetRequiredService<IMessageRepository>();

            // 3. Save to SQL via ADO.NET[cite: 2]
            await repo.SaveMessageAsync(roomGuid, userId, formattedMessage);
        }

        // 4. Broadcast to the specific room group[cite: 2]
        await Clients.Group(roomId).SendAsync("ReceiveMessage", new
        {
            RoomId = roomId,
            Sender = username,
            Content = formattedMessage,
            Timestamp = DateTime.UtcNow
        });
    }

    public async Task TypingIndicator(string roomId)
    {
        // Broadcast "is typing" status to others in the room[cite: 2]
        await Clients.OthersInGroup(roomId).SendAsync("UserTyping", Context.User?.Identity?.Name);
    }


}