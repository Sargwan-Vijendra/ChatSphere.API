using ChatSphere.API.Services.Interfaces;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ChatSphere.API.Services.Implementations
{
    public class DbConnnectionFactory : IDbConnnectionFactory
    {
        private readonly string _connectionString;

        public DbConnnectionFactory(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found in appsettings.json");
        }
        public SqlConnection CreateConnection()
        {
            return new SqlConnection(_connectionString);
        }

    }
}
