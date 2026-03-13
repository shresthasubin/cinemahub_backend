import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SYP Cinema API",
      version: "1.0.0",
      description: "Backend API documentation for SYP cinema system.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["fullname", "email", "password", "agreeTerm"],
          properties: {
            fullname: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string" },
            agreeTerm: { type: "boolean" },
          },
        },
        HallRequest: {
          type: "object",
          required: ["hall_name", "hall_location", "hall_contact", "license"],
          properties: {
            hall_name: { type: "string" },
            hall_location: { type: "string" },
            hall_contact: { type: "string", example: "9800000000" },
            license: { type: "string", example: "091-12345678" },
            hallrooms: {
              type: "string",
              description:
                "JSON string array of room configs. Example: [{\"roomName\":\"A\",\"rows\":5,\"seatsPerRow\":10,\"emptySeats\":[\"0-1\"]}]",
            },
          },
        },
        HallRoomRequest: {
          type: "object",
          required: ["roomName", "rows", "columns"],
          properties: {
            roomName: { type: "string" },
            rows: { type: "integer", example: 8 },
            columns: { type: "integer", example: 12 },
          },
        },
        SeatRequest: {
          type: "object",
          required: ["row", "column", "type"],
          properties: {
            row: { type: "integer", example: 1 },
            column: { type: "integer", example: 1 },
            type: {
              type: "string",
              enum: ["seat", "gap"],
            },
            seatType: {
              type: "string",
              enum: ["regular", "premium"],
              description: "Required when type is `seat`",
            },
          },
        },
        ShowtimeRequest: {
          type: "object",
          required: ["show_date", "start_time"],
          properties: {
            show_date: { type: "string", format: "date" },
            start_time: { type: "string", example: "18:30" },
          },
        },
        HallApplicationRequest: {
          type: "object",
          required: ["hall_name", "hall_location", "hall_contact", "license"],
          properties: {
            hall_name: { type: "string" },
            hall_location: { type: "string" },
            hall_contact: { type: "string", example: "9800000000" },
            license: { type: "string", example: "091-12345678" },
            hallPoster: { type: "string", format: "binary" },
            hallrooms: {
              type: "string",
              description:
                "JSON string array for room and seat layout configuration",
            },
            totalCapacity: { type: "integer", example: 120 },
          },
        },
        HallApplicationReviewRequest: {
          type: "object",
          properties: {
            reviewNote: { type: "string" },
          },
        },
        ChatStartRequest: {
          type: "object",
          required: ["hall_id"],
          properties: {
            hall_id: { type: "integer" },
          },
        },
        ChatMessageRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/api/user/register": {
        post: {
          tags: ["User"],
          summary: "Register a user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: { 201: { description: "User registered" } },
        },
      },
      "/api/user/login": {
        post: {
          tags: ["User"],
          summary: "Login user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: { 200: { description: "Login successful" } },
        },
      },
      "/api/user/logout": {
        post: {
          tags: ["User"],
          summary: "Logout user",
          responses: { 200: { description: "Logout successful" } },
        },
      },
      "/api/user/me": {
        get: {
          tags: ["User"],
          summary: "Get current user profile",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Current user profile" } },
        },
      },
      "/api/user/get": {
        get: {
          tags: ["User"],
          summary: "Get all users",
          responses: { 200: { description: "Users list" } },
        },
      },
      "/api/user/update/{id}": {
        put: {
          tags: ["User"],
          summary: "Update user role (admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "User role updated" } },
        },
      },
      "/api/user/delete/{id}": {
        delete: {
          tags: ["User"],
          summary: "Delete user (admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "User deleted" } },
        },
      },
      "/api/user/update-user/{id}": {
        delete: {
          tags: ["User"],
          summary: "Update user details (currently defined as DELETE in backend)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "User updated" } },
        },
      },
      "/api/movie/register": {
        post: {
          tags: ["Movie"],
          summary: "Create movie (hall-admin/admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["movie_title", "description", "genre", "duration"],
                  properties: {
                    movie_title: { type: "string" },
                    description: { type: "string" },
                    genre: {
                      type: "string",
                      description: "Comma-separated or space-separated genres",
                    },
                    duration: { type: "integer" },
                    casts: {
                      type: "string",
                      description: "Comma-separated cast names",
                    },
                    castImages: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                      description: "Optional cast images (same order as casts)",
                    },
                    castProfiles: {
                      type: "string",
                      description:
                        "JSON array mapping cast names to images. Example: [{\"name\":\"Actor 1\",\"imageFileIndex\":0}]",
                    },
                    moviePoster: { type: "string", format: "binary" },
                    movieTrailer: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Movie created" } },
        },
      },
      "/api/movie/get": {
        get: {
          tags: ["Movie"],
          summary: "Get movies (hall-admin/admin)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Movies list" } },
        },
      },
      "/api/movie/update/{id}": {
        put: {
          tags: ["Movie"],
          summary: "Update movie (hall-admin/admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: false,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    movie_title: { type: "string" },
                    releaseDate: { type: "string", format: "date" },
                    description: { type: "string" },
                    genre: { type: "string" },
                    duration: { type: "integer" },
                    casts: { type: "string" },
                    castImages: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                    },
                    castProfiles: {
                      type: "string",
                      description:
                        "JSON array mapping cast names to either uploaded images via imageFileIndex or existing image filename via image",
                    },
                    isPlaying: { type: "boolean" },
                    moviePoster: { type: "string", format: "binary" },
                    movieTrailer: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Movie updated" } },
        },
      },
      "/api/movie/delete/{id}": {
        delete: {
          tags: ["Movie"],
          summary: "Delete movie (hall-admin/admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Movie deleted" } },
        },
      },
      "/api/hall/register": {
        post: {
          tags: ["Hall"],
          summary: "Create hall with optional room/seat layout (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/HallRequest" },
                    {
                      type: "object",
                      properties: {
                        totalCapacity: { type: "integer", example: 120 },
                        hallPoster: { type: "string", format: "binary" },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: { 201: { description: "Hall created" } },
        },
      },
      "/api/hall/get": {
        get: {
          tags: ["Hall"],
          summary: "Get halls",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Halls list" } },
        },
      },
      "/api/hall/get-active": {
        get: {
          tags: ["Hall"],
          summary: "Get active halls",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Active halls list" } },
        },
      },
      "/api/hall/update/{id}": {
        put: {
          tags: ["Hall"],
          summary: "Update hall (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: false,
            content: {
              "multipart/form-data": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/HallRequest" },
                    {
                      type: "object",
                      properties: {
                        hallPoster: { type: "string", format: "binary" },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: { 200: { description: "Hall updated" } },
        },
      },
      "/api/hall/delete/{id}": {
        delete: {
          tags: ["Hall"],
          summary: "Delete hall (admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Hall deleted" } },
        },
      },
      "/api/hall/apply": {
        post: {
          tags: ["Hall Application"],
          summary: "Submit hall staff application (user only)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: { $ref: "#/components/schemas/HallApplicationRequest" },
              },
            },
          },
          responses: { 201: { description: "Application submitted" } },
        },
      },
      "/api/hall/application/me": {
        get: {
          tags: ["Hall Application"],
          summary: "Get current user's latest hall staff application",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Latest application" } },
        },
      },
      "/api/hall/applications": {
        get: {
          tags: ["Hall Application"],
          summary: "Get pending hall staff applications (admin only)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Pending applications list" } },
        },
      },
      "/api/hall/applications/{id}/approve": {
        put: {
          tags: ["Hall Application"],
          summary: "Approve hall staff application (admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Application approved" },
            400: {
              description: "Approval blocked (duplicate hall/contact/license)",
            },
            500: { description: "Approval failed due to server/database error" },
          },
        },
      },
      "/api/hall/applications/{id}/reject": {
        put: {
          tags: ["Hall Application"],
          summary: "Reject hall staff application (admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HallApplicationReviewRequest",
                },
              },
            },
          },
          responses: { 200: { description: "Application rejected" } },
        },
      },
      "/api/hall-room/create-room/{hallId}": {
        post: {
          tags: ["Hall Room"],
          summary: "Create hall room",
          parameters: [
            {
              name: "hallId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HallRoomRequest" },
              },
            },
          },
          responses: { 201: { description: "Room created" } },
        },
      },
      "/api/hall-room/delete-room/{roomId}": {
        delete: {
          tags: ["Hall Room"],
          summary: "Delete hall room",
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Room deleted" } },
        },
      },
      "/api/seat/create-seat/{hallRoomId}": {
        post: {
          tags: ["Seat"],
          summary: "Create seats for hall room",
          parameters: [
            {
              name: "hallRoomId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SeatRequest" },
              },
            },
          },
          responses: { 201: { description: "Seats created" } },
        },
      },
      "/api/seat/get-seat/{hallRoomId}": {
        get: {
          tags: ["Seat"],
          summary: "Get seats by hall room",
          parameters: [
            {
              name: "hallRoomId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Seats list" } },
        },
      },
      "/api/showtime/create-showtime/{movieId}/{hallroomId}": {
        post: {
          tags: ["Showtime"],
          summary: "Create showtime (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "movieId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "hallroomId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShowtimeRequest" },
              },
            },
          },
          responses: {
            201: { description: "Showtime created" },
            400: { description: "Validation error" },
            403: { description: "Forbidden for hall-admin outside own hall" },
            409: { description: "Showtime overlap conflict" },
          },
        },
      },
      "/api/showtime/update-showtime/{showtimeId}": {
        put: {
          tags: ["Showtime"],
          summary: "Update showtime (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "showtimeId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShowtimeRequest" },
              },
            },
          },
          responses: {
            200: { description: "Showtime updated" },
            400: { description: "Validation error" },
            403: { description: "Forbidden for hall-admin outside own hall" },
            404: { description: "Showtime not found" },
            409: { description: "Showtime overlap conflict" },
          },
        },
      },
      "/api/showtime/get": {
        get: {
          tags: ["Showtime"],
          summary: "Get showtimes (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "movieId",
              in: "query",
              required: false,
              schema: { type: "integer" },
            },
            {
              name: "hallroomId",
              in: "query",
              required: false,
              schema: { type: "integer" },
            },
            {
              name: "showDate",
              in: "query",
              required: false,
              schema: { type: "string", format: "date" },
            },
          ],
          responses: { 200: { description: "Showtimes list" } },
        },
      },
      "/api/showtime/get/{showtimeId}": {
        get: {
          tags: ["Showtime"],
          summary: "Get showtime by id (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "showtimeId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Showtime details" },
            404: { description: "Showtime not found" },
          },
        },
      },
      "/api/showtime/movie/{movieId}": {
        get: {
          tags: ["Showtime"],
          summary: "Get showtimes by movie id",
          parameters: [
            {
              name: "movieId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Showtimes list for movie" } },
        },
      },
      "/api/showtime/hallroom/{hallroomId}": {
        get: {
          tags: ["Showtime"],
          summary: "Get showtimes by hallroom id (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "hallroomId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Showtimes list for hallroom" } },
        },
      },
      "/api/showtime/delete/{showtimeId}": {
        delete: {
          tags: ["Showtime"],
          summary: "Delete showtime (admin/hall-admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "showtimeId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Showtime deleted" },
            403: { description: "Forbidden for hall-admin outside own hall" },
            404: { description: "Showtime not found" },
          },
        },
      },
      "/api/chat/start": {
        post: {
          tags: ["Chat"],
          summary: "Start conversation with a hall admin by hall id",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatStartRequest" },
              },
            },
          },
          responses: {
            200: { description: "Conversation created or returned" },
            404: { description: "Hall or hall admin not found" },
          },
        },
      },
      "/api/chat/{conversationId}/message": {
        post: {
          tags: ["Chat"],
          summary: "Send message in a conversation",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "conversationId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatMessageRequest" },
              },
            },
          },
          responses: {
            200: { description: "Message sent" },
            403: { description: "Not authorized for this conversation" },
            404: { description: "Conversation not found" },
          },
        },
      },
      "/api/chat/{conversationId}/messages": {
        get: {
          tags: ["Chat"],
          summary: "Get paginated messages for a conversation",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "conversationId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1 },
            },
          ],
          responses: { 200: { description: "Messages fetched" } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
