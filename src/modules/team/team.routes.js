import { Router } from "express";
import {
  createMember,
  getAllMembers,
  deleteMember,
  getMemberById,
  updateMemberById
} from "./team.controller.js";
import { verifyToken, adminMiddleware } from "../../middleware/authMiddleware.js";
import { multerUpload } from '../../config/multer.js';

const router = Router();

router.post("/", verifyToken, multerUpload.single('image'), createMember);
router.get("/", getAllMembers);
router.get("/:memberId", verifyToken, getMemberById);
router.put("/:memberId", verifyToken, multerUpload.single('image'), updateMemberById);
router.delete("/:memberId", verifyToken, deleteMember);

export default router;
