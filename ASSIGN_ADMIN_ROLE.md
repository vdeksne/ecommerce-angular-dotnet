# How to Assign Admin Role to Default Admin User

## Automatic Assignment

The seed data has been updated to automatically ensure the default admin user (`admin@test.com`) always has the Admin role. This happens when the application starts.

## Manual Assignment Methods

### Method 1: Restart the Application

The easiest way is to restart the .NET API server. The seed data will run and ensure the admin user has the Admin role.

### Method 2: Via SQL Database

If you have access to the SQL Server database, you can manually assign the role:

```sql
-- First, find the Admin role ID
DECLARE @AdminRoleId NVARCHAR(450);
SELECT @AdminRoleId = Id FROM AspNetRoles WHERE Name = 'Admin';

-- Find the admin user ID
DECLARE @AdminUserId NVARCHAR(450);
SELECT @AdminUserId = Id FROM AspNetUsers WHERE Email = 'admin@test.com';

-- Check if the role is already assigned
SELECT * FROM AspNetUserRoles WHERE UserId = @AdminUserId AND RoleId = @AdminRoleId;

-- If not assigned, insert it
IF NOT EXISTS (SELECT 1 FROM AspNetUserRoles WHERE UserId = @AdminUserId AND RoleId = @AdminRoleId)
BEGIN
    INSERT INTO AspNetUserRoles (UserId, RoleId)
    VALUES (@AdminUserId, @AdminRoleId);
END
```

### Method 3: Via API (if you have another admin account)

If you're logged in as another admin, you can use the API:

```javascript
fetch('https://localhost:5001/api/admin/assign-admin-role', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'admin@test.com' })
})
  .then(r => r.json())
  .then(data => console.log('Result:', data));
```

### Method 4: Create a Temporary Endpoint (Development Only)

For development, you can create a temporary endpoint that doesn't require admin authentication. This should be removed in production.

## Verify the Role is Assigned

After assigning the role, verify it's working:

```javascript
fetch('https://localhost:5001/api/account/user-info', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('User Info:', data));
```

Look for `roles: ["Admin"]` in the response.

## Default Admin Credentials

- **Email:** `admin@test.com`
- **Password:** `Pa$$w0rd`

