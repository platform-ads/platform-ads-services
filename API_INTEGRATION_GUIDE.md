# API Integration Guide for Frontend

## Response Format

Tất cả API endpoints trả về format chuẩn để dễ dàng tích hợp với Axios và React Query.

### Success Response

```typescript
interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta; // Chỉ có khi response là paginated
  timestamp: string;
}

interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  timestamp: string;
  path?: string;
}
```

## Frontend Integration

### 1. Axios Setup

```typescript
// src/lib/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
```

### 2. Type Definitions

```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  timestamp: string;
  path?: string;
}

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  avatarLink: string;
  points: number;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  phoneNumber: string;
}

export interface LoginResponse {
  access_token: string;
}
```

### 3. API Service Functions

```typescript
// src/services/auth.service.ts
import axiosInstance from '@/lib/axios';
import {
  ApiResponse,
  LoginRequest,
  SignUpRequest,
  LoginResponse,
  User,
} from '@/types/api';

export const authService = {
  signIn: async (credentials: LoginRequest) => {
    const response = await axiosInstance.post<ApiResponse<LoginResponse>>(
      '/auth/signin',
      credentials,
    );
    return response.data;
  },

  signUp: async (data: SignUpRequest) => {
    const response = await axiosInstance.post<ApiResponse<User>>(
      '/auth/signup',
      data,
    );
    return response.data;
  },

  getProfile: async () => {
    const response =
      await axiosInstance.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  },
};
```

```typescript
// src/services/users.service.ts
import axiosInstance from '@/lib/axios';
import { ApiResponse, User } from '@/types/api';

export const usersService = {
  getUsers: async (params?: { current?: number; pageSize?: number }) => {
    const response = await axiosInstance.get<ApiResponse<User[]>>('/users', {
      params,
    });
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await axiosInstance.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  updateUser: async (data: Partial<User> & { _id: string }) => {
    const response = await axiosInstance.patch<ApiResponse<any>>(
      '/users',
      data,
    );
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/users/${id}`,
    );
    return response.data;
  },
};
```

### 4. React Query Hooks

```typescript
// src/hooks/useAuth.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { LoginRequest, SignUpRequest } from '@/types/api';
import { toast } from 'sonner';

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.signIn(credentials),
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.data.access_token);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
    },
  });
};

export const useSignUp = () => {
  return useMutation({
    mutationFn: (data: SignUpRequest) => authService.signUp(data),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData?.errors) {
        errorData.errors.forEach((err: any) => {
          toast.error(err.field ? `${err.field}: ${err.message}` : err.message);
        });
      } else {
        toast.error(errorData?.message || 'Sign up failed');
      }
    },
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile(),
    retry: false,
    enabled: !!localStorage.getItem('access_token'),
  });
};
```

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { toast } from 'sonner';

export const useUsers = (params?: { current?: number; pageSize?: number }) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersService.getUsers(params),
    keepPreviousData: true, // Giữ data cũ khi phân trang
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getUserById(id),
    enabled: !!id,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersService.updateUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data.data._id] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Update failed');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersService.deleteUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Delete failed');
    },
  });
};
```

### 5. Usage in Components

```tsx
// Login Component
import { useLogin } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    loginMutation.mutate(
      {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      },
      {
        onSuccess: () => {
          router.push('/dashboard');
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```

```tsx
// Users List Component with Pagination
import { useUsers } from '@/hooks/useUsers';
import { useState } from 'react';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUsers({
    current: page,
    pageSize: 10,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <div>
      <h1>{data?.message}</h1>

      <ul>
        {data?.data.map((user) => (
          <li key={user._id}>
            {user.username} - {user.email}
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {data?.meta && (
        <div>
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!data.meta.hasPreviousPage}
          >
            Previous
          </button>

          <span>
            Page {data.meta.currentPage} of {data.meta.totalPages}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.meta.hasNextPage}
          >
            Next
          </button>

          <span>Total: {data.meta.totalItems} users</span>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Error Handling

Luôn xử lý errors từ API:

```typescript
try {
  const response = await authService.signIn(credentials);
  // Handle success
} catch (error: any) {
  const errorData = error.response?.data as ApiErrorResponse;

  // Show validation errors
  if (errorData?.errors) {
    errorData.errors.forEach((err) => {
      console.error(`${err.field}: ${err.message}`);
    });
  } else {
    console.error(errorData?.message);
  }
}
```

### 2. Type Safety

Luôn sử dụng TypeScript types:

```typescript
const { data } = useQuery<ApiResponse<User[]>>({
  queryKey: ['users'],
  queryFn: usersService.getUsers,
});

// data.data sẽ có type User[]
```

### 3. Caching Strategy

Sử dụng React Query để optimize caching:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

1. Tất cả responses đều có `success` field để dễ dàng check status
2. `data` field luôn tồn tại trong success response (có thể null)
3. `meta` field chỉ có trong paginated responses
4. `errors` field trong error response là array để hỗ trợ validation errors
5. Timestamp format: ISO 8601 string
