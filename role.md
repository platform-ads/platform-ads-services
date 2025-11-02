# Role-based Access Control

## Admin Only

Chỉ admin mới truy cập được:

```typescript
@Roles('admin')
@Get()
function() { ... }
```

## User Only

Chỉ user với role 'user' mới truy cập được:

```typescript
@Roles('user')
@Get()
function() { ... }
```

## Multiple Roles

Cho phép cả admin và user:

```typescript
@Roles('admin', 'user')
@Get()
function() { ... }
```

## Public Access

Public - không cần xác thực:

```typescript
@Get()
function() { ... }
```
