# Backend API

Express and MongoDB backend for a video-sharing application. The current API
supports user registration, login, logout, password changes, current-user
lookup, and refresh-token rotation. A video data model is included, but video
API routes are not implemented yet.

## Requirements

- Node.js 20 or newer
- npm
- A MongoDB database
- A Cloudinary account (used to store registration avatar images)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.sample` to `.env` and set values for your environment:

   ```bash
   cp .env.sample .env
   ```

   Required configuration:

   | Variable                | Description                                                               |
   | ----------------------- | ------------------------------------------------------------------------- |
   | `PORT`                  | HTTP port; defaults to `8000`                                             |
   | `MONGODB_URI`           | MongoDB connection URI. The application selects the `backend_1` database. |
   | `CORS_ORIGIN`           | Allowed frontend origin(s), comma-separated if there is more than one.    |
   | `ACCESS_TOKEN_SECRET`   | Secret used to sign access JWTs.                                          |
   | `ACCESS_TOKEN_EXPIRY`   | Access JWT lifetime, for example `1d`.                                    |
   | `REFRESH_TOKEN_SECRET`  | Secret used to sign refresh JWTs.                                         |
   | `REFRESH_TOKEN_EXPIRY`  | Refresh JWT lifetime, for example `10d`.                                  |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name.                                                    |
   | `CLOUDINARY_API_KEY`    | Cloudinary API key.                                                       |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret.                                                    |

   Use unique, strong secrets and keep `.env` out of version control. When
   using browser cookies from a frontend, set `CORS_ORIGIN` to that frontend's
   exact origin; do not use `*` with credentialed requests.

3. Start the API:

   ```bash
   # Development (restarts when files change)
   npm run dev

   # Production
   npm start
   ```

The server connects to MongoDB before it starts listening. A successful
connection is reported in the console.

## API

Base URL: `http://localhost:8000`

### Health check

`GET /`

Returns `200 OK` when the HTTP server is running:

```json
{
  "message": "Server running"
}
```

### Register a user

`POST /api/v1/users/register`

Send a `multipart/form-data` request with these fields:

| Field      | Type | Required |
| ---------- | ---- | -------- |
| `username` | Text | Yes      |
| `email`    | Text | Yes      |
| `fullName` | Text | Yes      |
| `password` | Text | Yes      |
| `avatar`   | File | Yes      |

The uploaded avatar is sent to Cloudinary. Local upload files are stored
temporarily in `public/temp` and removed after the request. The maximum upload
size is 10 MB.

Example:

```bash
curl -X POST http://localhost:8000/api/v1/users/register \
  -F "username=sampleuser" \
  -F "email=sample@example.com" \
  -F "fullName=Sample User" \
  -F "password=replace-with-a-strong-password" \
  -F "avatar=@/path/to/avatar.png"
```

On success, the API returns `201 Created`, sets `accessToken` and
`refreshToken` as HTTP-only cookies, and returns the user profile (not the
password or token):

```json
{
  "statusCode": 201,
  "data": {
    "user": {
      "id": "user-id",
      "username": "sampleuser",
      "email": "sample@example.com",
      "fullName": "Sample User",
      "avatar": "https://res.cloudinary.com/...",
      "createdAt": "..."
    }
  },
  "message": "User registered successfully",
  "success": true
}
```

Usernames and email addresses are normalized to lowercase. A duplicate
username or email returns `409 Conflict`; missing fields or avatar return
`400 Bad Request`.

### Refresh tokens

`POST /api/v1/users/refresh-token`

Send the `refreshToken` cookie received during registration. The endpoint
validates and rotates the refresh token, then sets updated `accessToken` and
`refreshToken` cookies. Missing, expired, invalid, or revoked refresh tokens
return `401 Unauthorized`.

For browser clients on a different origin, send requests with credentials
enabled (for example, `credentials: "include"` in `fetch`) and configure
`CORS_ORIGIN` to allow the frontend origin.

### Log in

`POST /api/v1/users/login`

Send a JSON body with either `username` or `email`, and `password`:

```json
{
  "email": "sample@example.com",
  "password": "your-password"
}
```

On success, the API returns the user profile and sets new HTTP-only access and
refresh token cookies. Invalid credentials return `401 Unauthorized`.

### Log out

`POST /api/v1/users/logout`

Requires a valid access-token cookie or `Authorization: Bearer <access-token>`.
It removes the user's stored refresh token and clears both authentication
cookies.

### Change the current password

`POST /api/v1/users/change-password`

Requires authentication. Send the current password and a new password of at
least 8 characters:

```json
{
  "oldPassword": "your-current-password",
  "newPassword": "your-new-password"
}
```

The password is hashed before it is stored. The API rotates the refresh token
and updates both authentication cookies after a successful change.

### Get the current user

`GET /api/v1/users/current-user`

Requires a valid access-token cookie or `Authorization: Bearer <access-token>`.
Returns the authenticated user's public profile.

### Update the current user's avatar

`PATCH /api/v1/users/avatar_update`

Requires authentication. Send a `multipart/form-data` request with an `avatar`
file. The image is uploaded to Cloudinary and the authenticated user's avatar
URL is updated. The previous Cloudinary image is deleted after the update
succeeds. The response includes the updated public user profile.

## Data models

- **User**: username, email, full name, avatar URL, hashed password, and stored
  refresh token.
- **Video**: video and thumbnail URLs, title, description, duration, view
  count, publication status, and owner. Aggregate pagination is configured on
  the model; video endpoints are not available yet.

## Tests

Run the automated smoke tests with:

```bash
npm test
```

The tests cover the health check, registration and login validation,
authentication requirements for protected routes, refresh-token validation,
and cleanup of temporary upload files. Database and Cloudinary integration
require credentials and are not covered by these smoke tests.
