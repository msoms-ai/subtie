import { Server } from 'socket.io';

class SocketService {
  constructor() {
    this.io = null;
  }

  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      // User joins a project room to listen to its real-time updates
      socket.on('join_project', (projectId) => {
        if (projectId) {
          socket.join(`project_${projectId}`);
        }
      });

      socket.on('leave_project', (projectId) => {
        if (projectId) {
          socket.leave(`project_${projectId}`);
        }
      });
    });

    console.log('🔌 Socket.io real-time service initialized.');
  }

  /**
   * Emits live progress update to everyone viewing this project
   */
  emitProgress(projectId, data) {
    if (!this.io) return;
    this.io.to(`project_${projectId}`).emit('processing_progress', {
      projectId,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Emits admin events (queue count, workers)
   */
  emitAdminMetrics(metrics) {
    if (!this.io) return;
    this.io.emit('admin_metrics', metrics);
  }
}

export const socketService = new SocketService();
export default socketService;
