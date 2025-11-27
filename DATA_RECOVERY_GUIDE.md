# Data Recovery Guide

## Situation
Your recent product and portfolio (ArchiveImages) data was in the old SQL Server volume `angular-dotnet-ecommerce_sql-data`. This volume still exists and contains your data.

## Recovery Options

### Option 1: Use the Old Volume (Recommended)

1. **Stop current SQL Server:**
   ```bash
   export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
   docker compose down sql
   ```

2. **Update docker-compose.yml to use the old volume:**
   Change the volume name from `sql-data` to `angular-dotnet-ecommerce_sql-data`:
   ```yaml
   volumes:
     - angular-dotnet-ecommerce_sql-data:/var/opt/mssql
   ```

3. **Start SQL Server with old volume:**
   ```bash
   docker compose up -d sql
   ```

4. **Wait for SQL Server to start (2-3 minutes)**

5. **Your data should be restored!**

### Option 2: Export Data from Old Volume

If Option 1 doesn't work, we can export the data:

1. **Start a temporary SQL Server with the old volume:**
   ```bash
   export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
   docker run -d --name temp-sql-recovery \
     -e ACCEPT_EULA=Y \
     -e MSSQL_SA_PASSWORD='Password@1' \
     -e MSSQL_PID=Developer \
     -p 1434:1433 \
     -v angular-dotnet-ecommerce_sql-data:/var/opt/mssql \
     --platform linux/amd64 \
     mcr.microsoft.com/mssql/server:2022-latest
   ```

2. **Wait 2-3 minutes for SQL Server to start**

3. **Export Products table:**
   ```bash
   docker exec temp-sql-recovery /opt/mssql-tools18/bin/sqlcmd \
     -S localhost -U SA -P 'Password@1' \
     -d skinet \
     -Q "SELECT * FROM Products FOR JSON PATH" \
     > products_backup.json
   ```

4. **Export ArchiveImages table:**
   ```bash
   docker exec temp-sql-recovery /opt/mssql-tools18/bin/sqlcmd \
     -S localhost -U SA -P 'Password@1' \
     -d skinet \
     -Q "SELECT * FROM ArchiveImages FOR JSON PATH" \
     > archive_backup.json
   ```

5. **Import into new database** (once new SQL Server is ready)

### Option 3: Manual Recovery via API

If you remember some of your data, you can manually recreate it through the admin interface once the app is running.

## Current Status

- ✅ Old volume exists: `angular-dotnet-ecommerce_sql-data`
- ⏳ Recovery container: Starting
- 📝 Next: Choose recovery option above

## Important Notes

- The old volume was last used on Nov 23 (based on timestamps)
- Your data includes:
  - Products (custom products you added)
  - ArchiveImages (portfolio images)
  - Any custom configurations

## Quick Recovery Command

To quickly switch to the old volume:

```bash
cd ecommerce-angular-dotnet
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Stop current SQL Server
docker compose down sql

# Edit docker-compose.yml - change volume name to: angular-dotnet-ecommerce_sql-data

# Start with old volume
docker compose up -d sql

# Wait 2-3 minutes, then refresh your app
```





