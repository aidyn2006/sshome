# Frontend

Main launch instructions now live in the root README:

- [../README.md](../README.md)

Use the root guide if you want to run the full stack with Docker.

## Structure

- `mobile` - Expo React Native frontend

## Local Frontend Run

```powershell
cd frontend\mobile
npm install
npm run start
```

## API Connection For Local Expo Run

Set `EXPO_PUBLIC_API_BASE_URL` in `frontend/mobile/.env`:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`
- Physical device: `http://<YOUR_LOCAL_IP>:8000`

## Docker Frontend URL

When started through Docker Compose, open:

- `http://localhost:19006`
