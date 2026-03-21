import express from "express";
import { sequelize, conenctDB } from "./db/index.js";
import dotenv from "dotenv";
import cors from "cors";
import router from "./routes/index.js";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import User from "./model/user.model.js";
import { ensureNotificationColumns } from "./model/notification.model.js";
import swaggerSpec from "./swagger.js";
import swaggerUi from "swagger-ui-express";
import http from "http";
import { Server } from "socket.io";
import { setupSocket } from "./sockets/chat.socket.js";

dotenv.config({
  path: "./.env",
});

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: ["https://cinemahub-frontend.vercel.app","http://localhost:5173"],
    credentials: true,
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", router);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://cinemahub-frontend.vercel.app","http://localhost:5173"],
    credentials: true,
  },
});

app.set("io", io);
setupSocket(io);

const seedAdmins = async () => {
  try {
    const admins = [
      {
        fullname: "Admin",
        email: process.env.seed_admin,
        password: process.env.seed_admin_pass,
      },
    ];

    for (const admin of admins) {
      const adminExists = await User.findOne({ where: { email: admin.email } });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await User.create({
          fullname: admin.fullname,
          email: admin.email,
          password: hashedPassword,
          agreeTerm: true,
          role: "admin",
        });
        console.log(`${admin.fullname} seeded successfully`);
      } else {
        console.log(`${admin.fullname} already exists`);
      }
    }
  } catch (err) {
    console.log("Error seeding admins:", err.message);
  }
};

const syncDatabase = async () => {
  const forceSync = process.env.DB_SYNC_FORCE === "false";

  if (forceSync) {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  }

  try {
    await sequelize.sync({ force: forceSync });
    await ensureNotificationColumns();
  } finally {
    if (forceSync) {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  }
};

const startServer = async () => {
  await conenctDB();
  await syncDatabase();
  await seedAdmins();

  server.listen(port, () => {
    console.log(`App is listening at PORT: [${port}]`);
    app.get("/", (req, res) => {
      res.send("Backend is running...");
    });
  });
};

startServer();
