# SQL Server Troubleshooting Guide

## Current Issue: "Invalid argument" / SQL Server Restart Loop

The error you're seeing is caused by Azure SQL Edge container restarting continuously on Apple Silicon (ARM) Macs. This is a known compatibility issue.

## Quick Solutions

### Option 1: Wait Longer (Recommended First Try)

SQL Server can take 2-5 minutes to fully initialize, especially on first run:

```bash
# Check if SQL Server is running
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker ps | grep sql

# Wait for it to be healthy (not restarting)
# Then restart your API
cd API
dotnet run
```

### Option 2: Use SQL Server 2022 (More Stable on ARM)

Replace the SQL Server image in `docker-compose.yml`:

```yaml
sql:
  image: mcr.microsoft.com/mssql/server:2022-latest
  environment:
    ACCEPT_EULA: "Y"
    MSSQL_SA_PASSWORD: "Password@1"
    MSSQL_PID: "Developer"
  ports:
    - "1433:1433"
  volumes:
    - sql-data:/var/opt/mssql
  platform: linux/amd64
  restart: unless-stopped
```

Then restart:
```bash
docker compose down sql
docker compose up -d sql
```

### Option 3: Use Local SQL Server (If Installed)

If you have SQL Server installed locally, update `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=skinet;Integrated Security=true;TrustServerCertificate=True;"
  }
}
```

### Option 4: Use Cloud Database (Azure SQL, etc.)

Update the connection string to point to your cloud database.

## How to Check SQL Server Status

```bash
# Check container status
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker ps -a | grep sql

# Check logs
docker logs ecommerce-angular-dotnet-sql-1

# Test connection (when container is running)
docker exec ecommerce-angular-dotnet-sql-1 /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U SA -P 'Password@1' -Q "SELECT @@VERSION"
```

## Expected Behavior

- **First startup**: SQL Server takes 60-120 seconds to initialize
- **Container status**: Should show "Up" (not "Restarting")
- **Health check**: Should show "healthy" after initialization
- **API connection**: Will work once SQL Server is ready

## If SQL Server Keeps Restarting

1. **Check Docker Desktop resources:**
   - Ensure Docker Desktop has enough memory (4GB+ recommended)
   - Check Docker Desktop is using Rosetta 2 emulation for x86 images

2. **Try removing and recreating:**
   ```bash
   docker compose down sql
   docker volume rm ecommerce-angular-dotnet_sql-data
   docker compose up -d sql
   ```

3. **Check system logs:**
   ```bash
   docker logs ecommerce-angular-dotnet-sql-1 2>&1 | tail -50
   ```

## Temporary Workaround

While SQL Server is initializing, the API will show database errors. This is expected. Once SQL Server is ready (check with `docker ps`), refresh your browser or restart the API.

The API's migration code will automatically retry when SQL Server becomes available.





