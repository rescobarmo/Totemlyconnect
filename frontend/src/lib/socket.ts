import { io, Socket } from "socket.io-client";
import { useEffect, useRef } from "react";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    return () => {
      s.disconnect();
    };
  }, []);

  return socketRef.current;
}
