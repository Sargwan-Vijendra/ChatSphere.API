namespace ChatSphere.API.Services.Interfaces;

public interface IMessageFormatter
{
    /// <summary>
    /// Trims, sanitizes, and formats raw message text.
    /// </summary>
    string Format(string text);

    Guid InstanceId { get; }
}

