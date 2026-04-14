# Frontend

## Structure

- `mobile` - Expo mobile frontend

## Run Mobile

```bash
cd frontend/mobile
npm install
cp .env.example .env
npm run start
```

## API Connection

Set `EXPO_PUBLIC_API_BASE_URL` in `frontend/mobile/.env`:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`
- Physical device: `http://<YOUR_LOCAL_IP>:8000`
