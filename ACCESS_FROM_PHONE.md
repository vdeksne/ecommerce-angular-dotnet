# How to Access the App on Your Phone and Desktop

## Your Computer's IP Address

**192.168.1.120**

## Setup Steps

### 1. Make Sure Both Devices Are on the Same Wi-Fi Network

- Your computer and phone must be connected to the same Wi-Fi network

### 2. Restart the API (to listen on network)

```bash
# Stop the current API (Ctrl+C in the terminal)
# Then restart:
cd API
dotnet run
```

### 3. Start Angular Dev Server with Network Access

```bash
cd client
ng serve --host 0.0.0.0 --port 4200
```

**Note:** The `--host 0.0.0.0` flag allows access from both:

- **Desktop**: `http://localhost:4200` or `https://localhost:4200`
- **Phone**: `http://192.168.1.120:4200` or `https://192.168.1.120:4200`

The app automatically detects which URL you're using and connects to the correct API endpoint!

### 4. Access from Your Phone

#### Option A: Using HTTP (Easier, but browser will warn about certificate)

Open in your phone's browser:

```
http://192.168.1.120:4200
```

#### Option B: Using HTTPS (More secure, but requires accepting certificate)

Open in your phone's browser:

```
https://192.168.1.120:4200
```

**Important:** When using HTTPS, your phone will show a security warning because the SSL certificate is self-signed. You'll need to:

1. Click "Advanced" or "Details"
2. Click "Proceed anyway" or "Accept the risk"

### 5. If It Doesn't Work

#### Check Firewall

Your Mac's firewall might be blocking connections. To allow it:

1. Go to **System Settings** → **Network** → **Firewall**
2. Click **Options**
3. Make sure ports 4200 and 5001 are allowed, or temporarily disable firewall

#### Verify IP Address

If your IP changed, find it again:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Then update `client/src/environments/environment.development.ts` with the new IP.

#### Check Both Are Running

- API: Should be running on port 5001
- Angular: Should be running on port 4200 with `--host 0.0.0.0`

## Quick Commands

```bash
# Terminal 1: API
cd API
dotnet run

# Terminal 2: Angular (with network access)
cd client
ng serve --host 0.0.0.0 --port 4200
```

## Troubleshooting

### "Connection Refused" on Phone

- Make sure both devices are on the same Wi-Fi
- Check Mac firewall settings
- Verify API and Angular are running

### "SSL Certificate Error" on Phone

- This is normal with self-signed certificates
- Click "Advanced" → "Proceed anyway"

### API Calls Fail from Phone

- Check that `environment.development.ts` has the correct IP address (192.168.1.120)
- Restart Angular after changing the IP

## Alternative: Use Production Build

If dev server doesn't work, you can build and serve the production version:

```bash
cd client
ng build
cd ../API
dotnet run
```

Then access: `https://192.168.1.120:5001` (the API serves the built Angular app)
