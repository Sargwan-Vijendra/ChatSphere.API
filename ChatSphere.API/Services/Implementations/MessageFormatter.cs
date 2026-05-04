using ChatSphere.API.Services.Interfaces;
using System.Net;

namespace ChatSphere.API.Services.Implementations;

public class MessageFormatter : IMessageFormatter
{
    public Guid InstanceId { get; } = Guid.NewGuid();
    public string Format(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // 1. Trim whitespace from start and end
        var formatted = text.Trim();

        // 2. HTML Sanitize (Basic prevention for XSS)
        // This encodes characters like < and > so they don't execute as code
        formatted = WebUtility.HtmlEncode(formatted);

        // 3. Optional: Basic Emoji Parsing
        // You can expand this list as needed
        formatted = formatted
            .Replace(":)", "😊")
            .Replace(":(", "☹️")
            .Replace("<3", "❤️")
            .Replace(":fire:", "🔥");

        return formatted;
    }
}