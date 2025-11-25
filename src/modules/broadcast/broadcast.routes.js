import express from "express";
import { 
    createSubscriber, 
    getAllSubscribers, 
    getSubscriberById, 
    deleteSubscriber, 
    sendBroadcast, 
    sendBroadcastToAll, 
    getAllBroadcasts,
    getBroadcastById,
    deleteBroadcast
} from './broadcast.controller.js';
import { verifyToken, adminMiddleware } from "../../middleware/authMiddleware.js";



const router = express.Router();


//subscribe routes
router.post('/subscribe', createSubscriber);
router.get('/subscribe', verifyToken, adminMiddleware, getAllSubscribers);
router.get('/subscribe/:id', verifyToken, adminMiddleware, getSubscriberById);
router.delete('/subscribe/:id', verifyToken, adminMiddleware, deleteSubscriber);


//broadcast routes
router.post('/specific', verifyToken, adminMiddleware, sendBroadcast);
router.post('/', verifyToken, adminMiddleware, sendBroadcastToAll);
router.get('/:id', verifyToken, adminMiddleware, getAllBroadcasts);
router.get('/:id', verifyToken, adminMiddleware, getBroadcastById);
router.delete('/:id', verifyToken, adminMiddleware, deleteBroadcast);

export default router;