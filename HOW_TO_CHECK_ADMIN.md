# How to Check Admin Status

## Method 1: Browser Console (Easiest)

1. **Open your browser console:**

   - Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: Press `F12` or `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)

2. **Check admin status:**

   ```javascript
   fetch("https://localhost:5001/api/admin/check-admin-status", {
     credentials: "include",
   })
     .then((r) => r.json())
     .then((data) => console.log("Admin Status:", data));
   ```

3. **Check user info with roles:**
   ```javascript
   fetch("https://localhost:5001/api/account/user-info", {
     credentials: "include",
   })
     .then((r) => r.json())
     .then((data) => console.log("User Info:", data));
   ```

## Method 2: Check Console Logs

After logging in and trying to access `/admin`, check the browser console for these logs:

- `User info loaded:` - Shows the user data from API
- `isAdmin check:` - Shows roles and admin check result
- `Admin Guard Check:` - Shows what the guard sees

## Method 3: Default Admin Account

The app automatically creates a default admin account:

- **Email:** `admin@test.com`
- **Password:** `Pa$$w0rd`

Try logging in with this account and then navigate to `/admin`.

## Method 4: Check Database (SQL)

If you have access to the SQL Server database:

```sql
-- Check if your user has Admin role
SELECT u.Email, u.UserName, r.Name as Role
FROM AspNetUsers u
JOIN AspNetUserRoles ur ON u.Id = ur.UserId
JOIN AspNetRoles r ON ur.RoleId = r.Id
WHERE r.Name = 'Admin';
```

## Method 5: Assign Admin Role via API

If you're already logged in as an admin, you can assign the role to another user:

```javascript
fetch("https://localhost:5001/api/admin/assign-admin-role", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email: "your-email@example.com" }),
})
  .then((r) => r.json())
  .then((data) => console.log("Result:", data));
```

## What to Look For

- `isAdmin: true` - ✅ You have admin access
- `isAdmin: false` - ❌ You don't have admin access
- `isAuthenticated: false` - ❌ You're not logged in
- `roles: ["Admin"]` - ✅ You have Admin role
- `roles: []` or `roles: null` - ❌ No roles assigned

## Troubleshooting

1. **If you see `isAdmin: false`:**

   - Make sure you're logged in with an account that has the Admin role
   - Try the default admin account: `admin@test.com` / `Pa$$w0rd`
   - Check the database to verify the role is assigned

2. **If you see `isAuthenticated: false`:**

   - Make sure you're logged in
   - Check if cookies are enabled
   - Try logging out and logging back in

3. **If roles are empty:**
   - The user doesn't have any roles assigned
   - You need to assign the Admin role via database or API
