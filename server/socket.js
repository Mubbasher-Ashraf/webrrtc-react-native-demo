const { Server } = require("socket.io");
let IO;

module.exports.initIO = (httpServer) => {
  IO = new Server(httpServer);

  IO.use((socket, next) => {
    if (socket.handshake.query) {
      let callerId = socket.handshake.query.callerId;
      socket.user = callerId;
      next();
    }
  });

  const rooms = {};

  IO.on("connection", (socket) => {
    console.log(`User connected: ${socket.user}`);
    const callerId = socket.handshake.query.callerId;

    socket.on("joinRoom", (roomId) => {
      console.log(`User ${callerId} joined room ${roomId}`);
      if (!rooms[roomId]) {
        rooms[roomId] = {};
      }

      rooms[roomId][callerId] = socket.id;
      socket.join(roomId);

      Object.keys(rooms[roomId]).forEach((userId) => {
        if (userId !== callerId) {
          socket.to(rooms[roomId][userId]).emit("user-connected", callerId);
        }
      });
    });

    socket.on("leaveRoom", (roomId) => {
      console.log(`User ${callerId} left room ${roomId}`);
      socket.leave(roomId);
      delete rooms[roomId][callerId];

      Object.keys(rooms[roomId]).forEach((userId) => {
        socket.to(rooms[roomId][userId]).emit("userDisconnected", callerId);
      });
    });

    socket.on("call", (data) => {
      const { roomId, calleeId, rtcMessage } = data;
      const calleeSocketId = rooms[roomId][calleeId];
      if (calleeSocketId) {
        socket.to(calleeSocketId).emit("call", {
          callerId,
          rtcMessage,
        });
      }
    });

    socket.on("answerCall", (data) => {
      const { roomId, callerId, rtcMessage } = data;
      const callerSocketId = rooms[roomId][callerId];
      if (callerSocketId) {
        socket.to(callerSocketId).emit("answerCall", {
          callerId,
          rtcMessage,
        });
      }
    });

    socket.on("ICEcandidate", (data) => {
      const { roomId, calleeId, rtcMessage } = data;
      const calleeSocketId = rooms[roomId][calleeId];
      if (calleeSocketId) {
        socket.to(calleeSocketId).emit("ICEcandidate", {
          sender: callerId,
          rtcMessage,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      for (const roomId in rooms) {
        if (rooms.hasOwnProperty(roomId)) {
          if (rooms[roomId][callerId]) {
            delete rooms[roomId][callerId];

            Object.keys(rooms[roomId]).forEach((userId) => {
              socket
                .to(rooms[roomId][userId])
                .emit("userDisconnected", callerId);
            });

            socket.leave(roomId);
          }
        }
      }
    });
  });
};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initilized.");
  } else {
    return IO;
  }
};
