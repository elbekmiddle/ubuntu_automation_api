import { io } from "socket.io-client";
import { API_HOST, getAccessToken } from "./api";

let clientSocket = null;

/**
 * `/clients` namespace'ga bitta umumiy socket ulanishi — sahifalar orasida
 * qayta ishlatiladi (masalan bir nechta terminal component ochilsa ham
 * bitta TCP ulanish yetadi).
 */
export function getClientSocket() {
  if (clientSocket) return clientSocket;

  clientSocket = io(`${API_HOST}/clients`, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  return clientSocket;
}

export function connectClientSocket() {
  const socket = getClientSocket();
  if (!socket.connected) socket.connect();
  return socket;
}
