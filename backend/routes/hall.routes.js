import express from "express";
import {
  hallDelete,
  hallGet,
  hallGetActive,
  hallRegister,
  hallActivate,
  hallUpdate,
} from "../controllers/hall.controller.js";
import {
  approveHallApplication,
  createHallApplication,
  getMyHallApplication,
  getPendingHallApplications,
  rejectHallApplication,
} from "../controllers/hallApplication.controller.js";
import { verifyJWT, roleCheck } from "../middlewares/auth.middleware.js";
import { upload } from "../utils/multer.js";

const hallRouter = express.Router();

hallRouter.post(
  "/register",
  verifyJWT,
  upload.single("hallPoster"),roleCheck(["admin","hall-admin"]),
  hallRegister,
);
hallRouter.put(
  "/update/:id",
  [verifyJWT, roleCheck(["admin","hall-admin"])],
  upload.single("hallPoster"),
  hallUpdate,
);
hallRouter.get("/get", [verifyJWT, roleCheck(["admin","hall-admin"])], hallGet);
hallRouter.get("/get-active", hallGetActive);
hallRouter.delete("/delete/:id", [verifyJWT, roleCheck(["admin"])], hallDelete);
hallRouter.put("/activate/:id", [verifyJWT, roleCheck(["admin","hall-admin"])], hallActivate);

hallRouter.post(
  "/apply",
  [verifyJWT, roleCheck(["user"])],
  upload.single("hallPoster"),
  createHallApplication,
);
hallRouter.get("/application/me", verifyJWT, getMyHallApplication);
hallRouter.get(
  "/applications",
  [verifyJWT, roleCheck(["admin"])],
  getPendingHallApplications,
);
hallRouter.put(
  "/applications/:id/approve",
  [verifyJWT, roleCheck(["admin"])],
  approveHallApplication,
);
hallRouter.put(
  "/applications/:id/reject",
  [verifyJWT, roleCheck(["admin"])],
  rejectHallApplication,
);

export default hallRouter;
