import { Router } from "express";
import {
  createMember,
  getAllMembers,
  deleteMember
} from "./team.controller.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { multerUpload } from '../../config/multer.js';

const router = Router();

router.post("/", verifyToken, multerUpload.single('image'), createMember);
router.get("/", getAllMembers);
router.delete("/:id", verifyToken, deleteMember);

export default router;
