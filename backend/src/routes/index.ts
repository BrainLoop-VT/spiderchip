import express from "express";
import authRoutes from "./authRoutes";
import roleRoutes from "./roleRoutes";
import testRoutes from "./testRoutes";
import userRoutes from "./userRoutes";
import levelRoutes from "./levelRoutes";
const router = express.Router();

console.log('Registering routes...');
router.use("/auth", authRoutes);
router.use("/role", roleRoutes);
router.use("/test", testRoutes);
router.use("/user", userRoutes);
router.use("/levels", levelRoutes);
console.log('Routes registered');

export default router;
