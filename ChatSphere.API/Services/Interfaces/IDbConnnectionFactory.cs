using Microsoft.Data.SqlClient;
using System.Data;

namespace ChatSphere.API.Services.Interfaces
{
    public interface IDbConnnectionFactory
    {
        public SqlConnection CreateConnection();
    }
}
