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

  const users = {};

  IO.on("connection", (socket) => {
    const callerId = socket.handshake.query.callerId;
    users[callerId] = socket;

    socket.on("joinRoom", (roomId) => {
      for (const [id, socket] of Object.entries(users)) {
        if (id !== callerId) {
          socket.emit("call", {
            callerId,
            rtcMessage: users[callerId].rtcMessage,
          });
        }
      }
    });

    socket.on("answerCall", ({ roomId, callerId, rtcMessage }) => {
      if (users[callerId]) {
        users[callerId].emit("answerCall", {
          callee: socket.handshake.query.callerId,
          rtcMessage,
        });
      }
    });

    socket.on("ICEcandidate", ({ roomId, calleeId, rtcMessage }) => {
      if (users[calleeId]) {
        users[calleeId].emit("ICEcandidate", {
          sender: socket.handshake.query.callerId,
          rtcMessage,
        });
      }
    });

    socket.on("leaveRoom", (roomId) => {
      for (const [id, otherSocket] of Object.entries(users)) {
        if (id !== callerId) {
          otherSocket.emit("userDisconnected", callerId);
        }
      }
    });

    socket.on("disconnect", () => {
      delete users[callerId];
      for (const [id, socket] of Object.entries(users)) {
        socket.emit("userDisconnected", callerId);
      }
    });
    // console.log("A user connected:", socket.user);

    // socket.on("joinRoom", (roomId) => {
    //   socket.join(roomId);
    //   users[socket.id] = roomId;

    //   // Broadcast to other users in the room
    //   socket.to(roomId).emit("newCall", {
    //     callerId: socket.id,
    //     rtcMessage: socket.handshake.query,
    //   });
    // });

    // socket.on("answerCall", (data) => {
    //   const { roomId, callerId, rtcMessage } = data;
    //   socket.to(roomId).emit("callAnswered", {
    //     callee: callerId,
    //     rtcMessage,
    //   });
    // });

    // socket.on("ICEcandidate", (data) => {
    //   const { roomId, calleeId, rtcMessage } = data;
    //   socket.to(roomId).emit("ICEcandidate", {
    //     sender: socket.id,
    //     rtcMessage,
    //   });
    // });

    // socket.on("leaveRoom", (roomId) => {
    //   let callerId = socket.handshake.query.callerId;
    //   for (const [id, socket] of Object.entries(users)) {
    //     if (id !== callerId) {
    //       socket.emit("userDisconnected", callerId);
    //     }
    //   }
    // });

    // socket.on("disconnect", () => {
    //   console.log("A user disconnected:", socket.id);
    //   const roomId = users[socket.id];
    //   delete users[socket.id];

    //   if (roomId) {
    //     socket.to(roomId).emit("userDisconnected", socket.id);
    //   }
    // });
    // console.log(socket.user, "Connected");
    // socket.join(socket.user);
    // socket.on("joinRoom", (roomId) => {
    //   socket.join(roomId);
    //   socket.roomId = roomId;

    //   const usersInRoom = Array.from(
    //     IO.sockets.adapter.rooms.get(roomId) || []
    //   ).filter((id) => id !== socket.id);

    //   usersInRoom.forEach((userId) => {
    //     IO.to(userId).emit("userJoined", socket.user);
    //   });
    // });

    // socket.on("call", (data) => {
    //   console.log("calling....");
    //   let roomId = data.roomId;
    //   let rtcMessage = data.rtcMessage;

    //   socket.to(roomId).emit("newCall", {
    //     callerId: socket.user,
    //     rtcMessage: rtcMessage,
    //   });
    // });

    // socket.on("answerCall", (data) => {
    //   let roomId = data.roomId;
    //   rtcMessage = data.rtcMessage;
    //   console.log("call answer...");

    //   socket.to(roomId).emit("callAnswered", {
    //     callee: socket.user,
    //     rtcMessage: rtcMessage,
    //   });
    // });

    // socket.on("ICEcandidate", (data) => {
    //   let roomId = data.roomId;
    //   let rtcMessage = data.rtcMessage;
    //   console.log("ICEcandidate...");

    //   socket.to(roomId).emit("ICEcandidate", {
    //     sender: socket.user,
    //     rtcMessage: rtcMessage,
    //   });
    // });

    // socket.on("disconnect", () => {
    //   console.log(socket.user, "Disconnected");
    //   if (socket.roomId) {
    //     socket.to(socket.roomId).emit("userDisconnected", socket.user);
    //   }
    // });
  });
};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initilized.");
  } else {
    return IO;
  }
};
