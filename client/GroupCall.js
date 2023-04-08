import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import SocketIOClient from 'socket.io-client';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';

const configuration = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};

const GroupCall = () => {
  const [socket, setSocket] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [connections, setConnections] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const roomId = 'abc123'; // Replace with a generated room ID that users will share to join the same group call
  const [callerId] = useState(
    Math.floor(100000 + Math.random() * 900000).toString(),
  );

  useEffect(() => {
    const newSocket = SocketIOClient('http://172.18.0.1:3500', {
      transports: ['websocket'],
      query: {
        callerId,
      },
    });
    setSocket(newSocket);
    initSocketListeners(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const initSocketListeners = socket => {
    socket.on('call', async data => {
      const {callerId, rtcMessage} = data;
      if (!connections[callerId]) {
        const peer = await createPeerConnection(callerId, false);
        await peer.setRemoteDescription(new RTCSessionDescription(rtcMessage));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(new RTCSessionDescription(answer));

        socket.emit('answerCall', {
          roomId,
          callerId: callerId,
          rtcMessage: answer,
        });
      }
    });

    socket.on('answerCall', async data => {
      const {callee, rtcMessage} = data;
      const peer = connections[callee];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(rtcMessage));
      }
    });

    socket.on('ICEcandidate', async data => {
      const {sender, rtcMessage} = data;
      const candidate = new RTCIceCandidate(rtcMessage);
      const peer = connections[sender];
      if (peer) {
        await peer.addIceCandidate(candidate);
      }
    });

    socket.on('userDisconnected', userId => {
      const updatedConnections = {...connections};
      delete updatedConnections[userId];
      setConnections(updatedConnections);

      const updatedRemoteStreams = {...remoteStreams};
      delete updatedRemoteStreams[userId];
      setRemoteStreams(updatedRemoteStreams);
    });
  };

  const createPeerConnection = async (id, isCaller) => {
    const peer = new RTCPeerConnection(configuration);

    peer.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ICEcandidate', {
          roomId,
          calleeId: id,
          rtcMessage: event.candidate,
        });
      }
    };

    peer.onaddstream = event => {
      setRemoteStreams(prevRemoteStreams => ({
        ...prevRemoteStreams,
        [id]: event.stream,
      }));
    };

    if (!isCaller) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });
    }

    setConnections(prevConnections => ({...prevConnections, [id]: peer}));
    return peer;
  };

  const startCall = async () => {
    if (!localStream) {
      await initLocalStream();
    }

    socket.emit('joinRoom', roomId);
    setIsInCall(true);
  };

  const initLocalStream = async () => {
    const isFront = true;
    const devices = await mediaDevices.enumerateDevices();

    const facing = isFront ? 'front' : 'environment';
    const videoSourceId = devices.find(
      device => device.kind === 'videoinput' && device.facing === facing,
    );
    const facingMode = isFront ? 'user' : 'environment';

    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode,
        optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
      },
    };

    const newLocalStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newLocalStream);
  };

  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    Object.values(connections).forEach(peer => {
      peer.close();
    });

    setConnections({});
    setRemoteStreams({});

    socket.emit('leaveRoom', roomId);
    setIsInCall(false);
  };

  return (
    <View style={styles.container}>
      {!isInCall && (
        <TouchableOpacity onPress={startCall} style={styles.joinButton}>
          <Text style={styles.buttonText}>Join Group Call</Text>
          <Text style={styles.buttonText}>{`Caller Id: ${callerId}`}</Text>
        </TouchableOpacity>
      )}
      {isInCall && (
        <TouchableOpacity onPress={leaveCall} style={styles.leaveButton}>
          <Text style={styles.buttonText}>Leave Group Call</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.videoContainer}
        contentContainerStyle={styles.videoContent}>
        {localStream && (
          <RTCView
            key="local"
            objectFit="cover"
            style={styles.localVideo}
            streamURL={localStream.toURL()}
          />
        )}
        {Object.keys(remoteStreams).map(userId => (
          <RTCView
            key={userId}
            objectFit="cover"
            style={styles.remoteVideo}
            streamURL={remoteStreams[userId].toURL()}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: 'blue',
    padding: 20,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
  },
  videoContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    width: 180,
    height: 120,
    backgroundColor: 'black',
    borderRadius: 5,
    margin: 10,
  },
  remoteVideo: {
    width: 180,
    height: 120,
    backgroundColor: 'black',
    borderRadius: 5,
    margin: 10,
  },
  leaveButton: {
    backgroundColor: 'red',
    padding: 20,
    marginBottom: 20,
  },
});

export default GroupCall;
