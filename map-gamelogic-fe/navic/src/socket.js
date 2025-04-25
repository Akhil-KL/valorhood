import { io } from "socket.io-client";

const isDev = process.env.NODE_ENV === "development";
const hostname = window?.location?.hostname || "localhost";
const protocol = window?.location?.protocol || "http:";

let SERVER_URL;

if (isDev) {
  SERVER_URL = "http://172.24.3.238:5000"; 
} else {
  SERVER_URL = `${protocol}//${hostname}:5000`;
}

console.log("🔌 Connecting to socket server at:", SERVER_URL);

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error.message || error);
});

export default socket;
