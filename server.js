// ============================================
// FILE: server.js (Entry Point)
// ============================================

import app from './src/app.js';
import { startServer } from './src/config/server.js';

startServer(app);