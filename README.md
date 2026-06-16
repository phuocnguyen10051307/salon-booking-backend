# Salon Booking Server

Backend REST API cho hệ thống đặt lịch salon. Dự án được xây dựng bằng Node.js, Express, Prisma và PostgreSQL, hỗ trợ xác thực người dùng, quản lý dịch vụ, stylist, giỏ đặt lịch, booking, khuyến mãi, thông báo, chat và các chức năng quản trị.

## Tính năng chính

- Đăng ký, đăng nhập, đăng xuất, refresh token và lấy thông tin người dùng hiện tại.
- Quản lý hồ sơ cá nhân và đổi mật khẩu.
- Quản lý danh mục dịch vụ, dịch vụ salon và stylist.
- Gán dịch vụ cho stylist.
- Quản lý giỏ đặt lịch của khách hàng.
- Tạo booking, xem lịch sử booking, hủy lịch và đổi lịch.
- Quản lý thông báo, khuyến mãi và chi nhánh salon.
- Quản lý phiên đăng nhập.
- Lưu và quản lý tin nhắn chat.
- API quản trị cho dashboard, thống kê, báo cáo, người dùng và booking.
- Tài liệu API bằng Swagger UI tại `/api-docs`.

## Công nghệ sử dụng

- Node.js + Express 5
- PostgreSQL
- Prisma ORM
- JWT cho access token và refresh token
- Cookie HTTP-only cho refresh token
- Zod để validate request
- Swagger UI để hiển thị tài liệu API
- Helmet, CORS, Morgan và Cookie Parser

## Cấu trúc thư mục

```text
src/
  config/          Cấu hình môi trường, CORS, cookie, database và Prisma
  controllers/     Xử lý request/response cho từng nhóm API
  middlewares/     Middleware xác thực, validate và xử lý lỗi
  providers/       Provider JWT
  routes/          Khai báo route API theo version
  services/        Logic nghiệp vụ, hiện có auth service
  utils/           Helper, constant, formatter và custom error
  validations/     Schema validate bằng Zod
  swagger.json     Tài liệu OpenAPI cho Swagger UI
prisma/
  schema.prisma    Schema database
  migrations/      Lịch sử migration
```

## Cài đặt

```bash
npm install
```

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

Cấu hình các biến môi trường cần thiết:

```env
HOST=localhost
PORT=3000
BUILD_MODE=development

DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRATION=14d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Database

Generate Prisma Client:

```bash
npx prisma generate
```

Chạy migration nếu cần tạo/cập nhật database:

```bash
npx prisma migrate dev
```

## Chạy dự án

Chạy ở môi trường phát triển:

```bash
npm run dev
```

Chạy bằng Node:

```bash
npm start
```

Mặc định server chạy tại:

```text
http://localhost:3000
```

## Tài liệu API

Sau khi server chạy, mở Swagger UI tại:

```text
http://localhost:3000/api-docs
```

Swagger hiện mô tả đầy đủ các nhóm API:

- System
- Auth
- Users
- Categories
- Services
- Stylists
- Cart
- Bookings
- Admin Bookings
- Notifications
- Promotions
- Locations
- Sessions
- Chat
- Admin dashboard, statistics, reports và users

## Một số endpoint chính

```text
GET    /v1/status

POST   /v1/auth/signup
POST   /v1/auth/signin
GET    /v1/auth/me
POST   /v1/auth/signout
POST   /v1/auth/refresh-token

GET    /v1/categories
GET    /v1/services
GET    /v1/stylists
GET    /v1/promotions
GET    /v1/locations

GET    /v1/cart
POST   /v1/cart/items
POST   /v1/bookings
GET    /v1/bookings

GET    /v1/admin/dashboard
GET    /v1/admin/bookings
GET    /v1/admin/users
```

Các endpoint cần đăng nhập sử dụng header:

```text
Authorization: Bearer <accessToken>
```

## Scripts

```bash
npm run dev      # Chạy server bằng nodemon
npm start        # Chạy server bằng node
npm run lint     # Kiểm tra lint
npm run format   # Format code bằng Prettier
```

## Ghi chú

- Response API thường có dạng `success`, `message` và `data`.
- Refresh token được lưu trong cookie tên `refreshToken`.
- Nếu frontend và backend chạy khác origin, cần kiểm tra cấu hình CORS trong `src/config/cors.js`.
- File Swagger được load từ `src/swagger.json`, nên sau khi sửa tài liệu chỉ cần restart server để Swagger UI nhận bản mới.
