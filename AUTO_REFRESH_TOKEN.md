# Automatic Token Refresh - Server Side

## 🎯 Tính năng

Server tự động refresh access token khi hết hạn, **frontend KHÔNG cần gọi API `/auth/refresh`** nữa.

## 🔧 Cách hoạt động

### 1. **JWT Auth Guard** tự động xử lý

File: `src/modules/auth/passport/jwt-auth.guard.ts`

```typescript
// Khi access token hết hạn:
1. Guard bắt lỗi TokenExpiredError
2. Kiểm tra xem có refresh token trong cookie không
3. Tự động gọi authService.refreshTokens()
4. Set tokens mới vào cookies
5. Tiếp tục xử lý request bình thường
```

### 2. **Flow chi tiết**

```
Client Request → JwtAuthGuard
                    ↓
          Access Token Valid? → YES → Continue
                    ↓ NO
          Access Token Expired?
                    ↓ YES
          Has Refresh Token? → NO → 401 Unauthorized
                    ↓ YES
          Refresh Tokens
                    ↓
          Set New Cookies
                    ↓
          Continue Request
```

## 📱 Frontend Setup

### Axios Configuration

```typescript
// lib/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true, // ⭐ QUAN TRỌNG: Gửi cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// KHÔNG CẦN interceptor để refresh token nữa!
// Server tự động xử lý

export default api;
```

### React Query Example

```typescript
// hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/profile');
      return data;
    },
    // Không cần xử lý lỗi 401 để refresh token
    // Server tự động làm điều đó
  });
};
```

## ✅ Ưu điểm

1. **Đơn giản hóa Frontend**: Không cần code interceptor phức tạp
2. **Seamless UX**: User không bị gián đoạn khi token hết hạn
3. **Bảo mật**: Tokens được xử lý hoàn toàn trên server
4. **Automatic**: Mọi protected API đều được tự động refresh

## 🔐 Bảo mật

- ✅ Refresh token được lưu trong **HTTP-only cookie**
- ✅ Access token được lưu trong **HTTP-only cookie**
- ✅ Frontend **KHÔNG** thể đọc tokens qua JavaScript
- ✅ Protected khỏi **XSS attacks**

## 📝 Lưu ý

### Endpoint `/auth/refresh` vẫn tồn tại

- Có thể dùng để **manual refresh** nếu cần
- **KHÔNG bắt buộc** frontend phải gọi
- Giữ lại cho tính linh hoạt

### Logout

```typescript
// Vẫn cần gọi logout để xóa tokens
await api.post('/auth/logout');
```

### CORS Configuration

Đảm bảo backend cho phép credentials:

```typescript
// main.ts
app.enableCors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true, // ⭐ QUAN TRỌNG
});
```

## 🚀 Kết quả

Frontend chỉ cần:

```typescript
// ✅ Đơn giản như thế này thôi!
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  withCredentials: true,
});

// Tất cả API calls tự động được refresh token khi cần
await api.get('/users/profile');
await api.get('/videos');
await api.post('/users/me', data);
```

## 🎉 Không cần code này nữa!

```typescript
// ❌ KHÔNG CẦN interceptor này nữa
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic...
    }
    return Promise.reject(error);
  }
);
```
