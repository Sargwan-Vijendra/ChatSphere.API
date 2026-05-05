using ChatSphere.API.Hubs; // Ensure you have this for ChatHub
using ChatSphere.API.Repositories;
using ChatSphere.API.Repositories.Implementations;
using ChatSphere.API.Repositories.Interfaces;
using ChatSphere.API.Services.Implementations;
using ChatSphere.API.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Connections;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- 1. JWT AUTHENTICATION CONFIGURATION ---

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:62047") // Your React Vite port
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // REQUIRED for SignalR
    });
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyThatIsAtLeast32CharsLong"))
    };
});

builder.Services.AddAuthorization();

// --- 2. SIGNALR CONFIGURATION ---
builder.Services.AddSignalR(); // Required for Real-time Messaging

// --- 3. DEPENDENCY INJECTION (Corrected Lifetimes) ---

// Singleton: App-wide instances
builder.Services.AddSingleton<IDbConnnectionFactory, DbConnnectionFactory>();
builder.Services.AddSingleton<ITokenService, TokenService>(); // Changed from Scoped to Singleton
builder.Services.AddSingleton<IOnlineUserTracker, OnlineUserTracker>(); // Must be Singleton for presence

// Scoped: Once per HTTP Request[cite: 2]
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();

// Transient: New every time requested[cite: 2]
builder.Services.AddTransient<IPasswordHasher, PasswordHasher>(); // Changed from Scoped to Transient[cite: 2]
builder.Services.AddTransient<IMessageFormatter, MessageFormatter>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// --- 4. SWAGGER CONFIGURATION ---
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "ChatSphere API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token only"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// --- 5. MIDDLEWARE PIPELINE ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.UseHttpsRedirection();

// Authentication MUST come before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map the SignalR Hub[cite: 2]
app.MapHub<ChatHub>("/hubs/chat");

app.Run();