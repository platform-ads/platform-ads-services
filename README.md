````markdown
## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```
nest g resource users --no-spec
https://www.npmjs.com/package/api-query-params

## Email Service Setup

### Quick Setup (5 steps)

**1. Configure Laravel Mail Service** (`platform-ads-mail-services/.env`):

```env
MAIL_MAILER=smtp
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USERNAME="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"          # Get from https://myaccount.google.com/apppasswords
MAIL_FROM_ADDRESS="your-email@gmail.com"   # Email only, no name
MAIL_FROM_NAME="Platform Ads"
QUEUE_CONNECTION=sync                       # Use 'sync' for dev, 'database' for prod
```

**2. Start Laravel server:**

```bash
cd platform-ads-mail-services
php artisan serve  # http://localhost:8000
```

**3. Configure NestJS** (`platform-ads-services/.env`):

```env
LARAVEL_MAIL_API_URL=http://localhost:8000/api/mail/send
CLIENT_URL=http://localhost:3000
```

**4. Use in your code:**

```typescript
import { MailService } from '../../lib/mail.service';

constructor(private mailService: MailService) {}

await this.mailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',  // or 'verify-email'
  context: {
    username: 'John',
    email: 'user@example.com',
    loginUrl: 'http://localhost:3000/login',
    // ... other template variables
  }
});
```

**5. Test it:**

```bash
curl http://localhost:3000/auth/mail
```

### Available Templates

- `welcome` - Welcome email after registration
- `verify-email` - Email verification with token

### Production (Optional)

Use queue for better performance:

```env
# Laravel .env
QUEUE_CONNECTION=database
```

```bash
php artisan queue:table && php artisan migrate
php artisan queue:work
```