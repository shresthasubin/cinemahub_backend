# SYP Cinema API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the request headers:

```
Authorization: Bearer <token>
```

---

## Endpoints

### User Endpoints

Base URL: `/api/user`

| Method | Endpoint           | Description                     | Auth Required | Role Required |
| ------ | ------------------ | ------------------------------- | ------------- | ------------- |
| POST   | `/register`        | Register a new user             | ❌            | -             |
| POST   | `/login`           | Login user and get JWT token    | ❌            | -             |
| POST   | `/logout`          | Logout user                     | ❌            | -             |
| GET    | `/me`              | Get current logged-in user info | ✅            | -             |
| GET    | `/get`             | Get all users                   | ❌            | -             |
| PUT    | `/update/:id`      | Update user role                | ✅            | admin         |
| DELETE | `/delete/:id`      | Delete user                     | ✅            | admin         |
| DELETE | `/update-user/:id` | Update user profile             | ✅            | admin         |

#### Request/Response Examples

**POST /register**

```json
{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**POST /login**

```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**GET /me**
Response:

```json
{
  "id": 1,
  "fullname": "John Doe",
  "email": "john@example.com",
  "role": "user"
}
```

---

### Movie Endpoints

Base URL: `/api/movie`

| Method | Endpoint      | Description          | Auth Required | Role Required     |
| ------ | ------------- | -------------------- | ------------- | ----------------- |
| POST   | `/register`   | Create new movie     | ✅            | hall-admin, admin |
| GET    | `/get`        | Get all movies       | ✅            | hall-admin, admin |
| PUT    | `/update/:id` | Update movie details | ✅            | hall-admin, admin |
| DELETE | `/delete/:id` | Delete movie         | ✅            | hall-admin, admin |

#### Request/Response Examples
    
**POST /register**

```json
{
  "movieName": "Action Movie",
  "releaseDate": "2024-03-15",
  "description": "An exciting action film",
  "category": "Action",
  "duration": 120,
  "language": "English",
  "rating": "PG-13"
}
```

Note: Upload `moviePoster` and `movieTrailer` as multipart form data.

---

### Hall Endpoints

Base URL: `/api/hall`

| Method | Endpoint      | Description         | Auth Required | Role Required     |
| ------ | ------------- | ------------------- | ------------- | ----------------- |
| POST   | `/register`   | Create new hall     | ✅            | admin, hall-admin |
| GET    | `/get`        | Get all halls       | ✅            | admin, hall-admin |
| GET    | `/get-active` | Get active halls    | ✅            | admin, hall-admin |
| PUT    | `/update/:id` | Update hall details | ✅            | admin, hall-admin |
| DELETE | `/delete/:id` | Delete hall         | ✅            | admin             |

#### Request/Response Examples

**POST /register**

```json
{
  "hallName": "Hall A",
  "location": "Main Street",
  "capacity": 200,
  "city": "New York"
}
```

Note: Upload `hallPoster` as multipart form data.

---

### Hall Room Endpoints

Base URL: `/api/hall-room`

| Method | Endpoint               | Description               | Auth Required | Role Required |
| ------ | ---------------------- | ------------------------- | ------------- | ------------- |
| POST   | `/create-room/:hallId` | Create new room in a hall | ❌            | -             |
| DELETE | `/delete-room/:roomId` | Delete room               | ❌            | -             |

#### Request/Response Examples

**POST /create-room/:hallId**

```json
{
  "roomName": "Room 1",
  "hallClassId": 1
}
```

---

### Seat Endpoints

Base URL: `/api/seat`

| Method | Endpoint                   | Description             | Auth Required | Role Required |
| ------ | -------------------------- | ----------------------- | ------------- | ------------- |
| POST   | `/create-seat/:hallRoomId` | Create seats in a room  | ❌            | -             |
| GET    | `/get-seat/:hallRoomId`    | Get all seats in a room | ❌            | -             |

#### Request/Response Examples

**POST /create-seat/:hallRoomId**

```json
{
  "seatRow": "A",
  "seatNumber": 1,
  "seatType": "standard"
}
```

**GET /get-seat/:hallRoomId**
Response:

```json
[
  {
    "id": 1,
    "seatRow": "A",
    "seatNumber": 1,
    "seatType": "standard",
    "isAvailable": true
  }
]
```

---

### Showtime Endpoints

Base URL: `/api/showtime`

| Method | Endpoint                                | Description                   | Auth Required | Role Required |
| ------ | --------------------------------------- | ----------------------------- | ------------- | ------------- |
| POST   | `/create-showtime/:movieId/:hallroomId` | Create new showtime           | ✅            | admin         |
| GET    | `/get`                                  | Get all showtimes             | ❌            | -             |
| GET    | `/get/:hallroomId`                      | Get showtimes for a hall room | ❌            | -             |
| GET    | `/get/:movieId`                         | Get showtimes for a movie     | ❌            | -             |
| PUT    | `/update-showtime/:showtimeId`          | Update showtime               | ✅            | admin         |
| GET    | `/delete/:showtimeId`                   | Delete showtime               | ❌            | -             |

#### Request/Response Examples

**POST /create-showtime/:movieId/:hallroomId**

```json
{
  "showDate": "2024-03-20",
  "startTime": "18:00",
  "endTime": "20:30",
  "price": 12.5
}
```

**GET /get**
Response:

```json
[
  {
    "id": 1,
    "movieId": 1,
    "hallroomId": 1,
    "showDate": "2024-03-20",
    "startTime": "18:00",
    "endTime": "20:30",
    "price": 12.5
  }
]
```

---

### Booking Endpoints

Base URL: `/api/booking`

| Method | Endpoint | Description        | Auth Required | Role Required |
| ------ | -------- | ------------------ | ------------- | ------------- |
| POST   | `/`      | Create new booking | ✅            | -             |

#### Request/Response Examples

**POST /**

```json
{
  "showtimeId": 1,
  "seatIds": [1, 2, 3]
}
```

---

### Chat Endpoints

Base URL: `/api/chat`

| Method | Endpoint   | Description                | Auth Required | Role Required |
| ------ | ---------- | -------------------------- | ------------- | ------------- |
| POST   | `/`        | Send message               | ✅            | -             |
| GET    | `/:userId` | Get chat history with user | ✅            | -             |

#### Request/Response Examples

**POST /**

```json
{
  "recipientId": 1,
  "message": "Hello, how can I help?"
}
```

**GET /:userId**
Response:

```json
[
  {
    "id": 1,
    "senderId": 2,
    "recipientId": 1,
    "message": "Hello!",
    "timestamp": "2024-03-20T18:00:00Z"
  }
]
```

---

### Payment Endpoints

Base URL: `/api/payment`

| Method | Endpoint | Description    | Auth Required | Role Required |
| ------ | -------- | -------------- | ------------- | ------------- |
| POST   | `/`      | Create payment | ✅            | -             |

#### Request/Response Examples

**POST /**

```json
{
  "bookingId": 1,
  "amount": 37.5,
  "paymentMethod": "credit_card"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid input data"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized - JWT token required"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden - Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Available User Roles

- `user` - Regular user
- `hall-admin` - Hall administrator
- `admin` - System administrator

---

## Environment Configuration

Configure the following in `.env` file:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=syp_cinema
JWT_SECRET=your_secret_key
seed_admin=admin@email.com
seed_admin_pass=admin_password
```

---

## File Upload Configuration

The API supports file uploads for:

- **Movies**: `moviePoster` (image), `movieTrailer` (video)
- **Halls**: `hallPoster` (image)

Uploaded files are stored in `/uploads` directory.

---

## CORS Configuration

- **Allowed Origin**: `http://localhost:5173` (Frontend dev server)
- **Credentials**: Enabled

---

## Notes

- All timestamps are in UTC format (ISO 8601)
- Pagination support may vary per endpoint
- Some endpoints may have incomplete implementations (marked with inconsistent path naming)
- Ticket routes are currently not implemented
