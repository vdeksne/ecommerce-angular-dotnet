# How to Check Admin Status

## Quick Check Methods

### 1. Browser Console (Easiest)
Open browser console (F12) and run:
```javascript
fetch('https://localhost:5001/api/admin/check-admin-status', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Admin Status:', data));
```

### 2. Check User Info
```javascript
fetch('https://localhost:5001/api/account/user-info', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('User Info:', data));
```

### 3. Default Admin Account
- **Email:** `admin@test.com`
- **Password:** `Pa$$w0rd`
- This account is automatically created with Admin role

### 4. Check via SQL Database
If you have access to the SQL Server database, run:
```sql
-- Find all admin users
SELECT u.Email, u.UserName, r.Name as Role
FROM AspNetUsers u
JOIN AspNetUserRoles ur ON u.Id = ur.UserId
JOIN AspNetRoles r ON ur.RoleId = r.Id
WHERE r.Name = 'Admin';
```

### 5. Assign Admin Role via API (if you're already admin)
```javascript
fetch('https://localhost:5001/api/admin/assign-admin-role', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'your-email@example.com' })
})
  .then(r => r.json())
  .then(data => console.log('Result:', data));
```

## What to Look For

- `isAdmin: true` - You have admin access
- `isAdmin: false` - You don't have admin access
- `isAuthenticated: false` - You're not logged in

## If You're Not Admin

1. Log in with the default admin account: `admin@test.com` / `Pa$$w0rd`
2. Or have an existing admin assign the role to your account
3. Or manually add the role via SQL (see Method 4)

