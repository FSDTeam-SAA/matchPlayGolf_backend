import { Router } from "express";
import {
  createMember,
  getAllMembers,
  deleteMember,
  getMemberById
} from "./team.controller.js";
import { verifyToken, adminMiddleware } from "../../middleware/authMiddleware.js";
import { multerUpload } from '../../config/multer.js';

const router = Router();

router.post("/", verifyToken, multerUpload.single('image'), createMember);
router.get("/", getAllMembers);
router.get("/single-member", verifyToken, adminMiddleware, getMemberById);
router.delete("/:id", verifyToken, deleteMember);

export default router;
