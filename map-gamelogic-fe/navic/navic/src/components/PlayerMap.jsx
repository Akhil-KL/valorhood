import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import socket from "../socket.js"; 


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});


const playerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const otherPlayerIcon = L.icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position);
    }
  }, [position, map]);
  return null;
};

const PlayerMap = () => {
  const [position, setPosition] = useState(null); 
  const [playerPosition, setPlayerPosition] = useState(null); 
  const [playerId, setPlayerId] = useState(null); 
  const [allPlayers, setAllPlayers] = useState({}); 
  const [connected, setConnected] = useState(false); 
  const [playerName, setPlayerName] = useState(() => {
 
    return localStorage.getItem("playerName") || `Player-${Math.floor(Math.random() * 1000)}`;
  });
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);


  useEffect(() => {
    
    socket.on("connect", () => {
      console.log("🔌 Connected to server with ID:", socket.id);
      setConnected(true);
      setPlayerId(socket.id);
      
      
      if (playerPosition) {
        socket.emit("updatePosition", {
          lat: playerPosition[0],
          lng: playerPosition[1],
          name: playerName
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
    });

   
    socket.on("playersUpdate", (playersData) => {
      console.log("📡 Received players update:", playersData);
      setAllPlayers(playersData);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("playersUpdate");
    };
  }, [playerName, playerPosition]);

 
  useEffect(() => {
    console.log("📍 Requesting location...");

    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }


    localStorage.setItem("playerName", playerName);

  
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        console.log("📌 My position:", newPos);
        setPosition(newPos);
        setPlayerPosition(newPos);

       
        if (socket.connected) {
          socket.emit("updatePosition", {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: playerName
          });
        }
      },
      (err) => {
        console.error("❌ Geolocation error:", err);
        alert(`Geolocation error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 50000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [playerName]);

 
  const isCloseToPlayer = (lat, lng) => {
    if (!playerPosition) return false;
    
    
    const tolerance = 0.00002; 
    
    return Math.abs(lat - playerPosition[0]) < tolerance && 
           Math.abs(lng - playerPosition[1]) < tolerance;
  };

  return (
    <div className="player-map-container">
      <div className="map-controls">
        <div className="status-indicator">
          <span className={connected ? "status-connected" : "status-disconnected"}>
            {connected ? "● Connected" : "● Disconnected"}
          </span>
        </div>
        <div className="player-name-container">
          <label htmlFor="playerName">Your Name: </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>
        {position && (
          <div className="player-coordinates">
            Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
          </div>
        )}
        <div className="players-count">
          Players Online: {Object.keys(allPlayers).length}
        </div>
      </div>

      {position && playerPosition ? (
        <MapContainer
          center={position}
          zoom={18}
          minZoom={15}
          maxZoom={20}
          style={{ height: "80vh", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap position={position} />
          
          {}
          <Marker position={position} icon={playerIcon}>
            <Popup>
              <strong>{playerName}</strong><br />
              Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
            </Popup>
          </Marker>

          {}
          {Object.entries(allPlayers).map(([id, player]) => {
            if (id === playerId || !player.lat || !player.lng || isCloseToPlayer(player.lat, player.lng)) {
              return null; 
            }

            return (
              <Marker key={id} position={[player.lat, player.lng]} icon={otherPlayerIcon}>
                <Popup>
                  <strong>{player.name || `Player ${id.substring(0, 4)}`}</strong><br />
                  {player.lat.toFixed(6)}, {player.lng.toFixed(6)}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      ) : (
        <div>Loading map...</div>
      )}
    </div>
  );
};

export default PlayerMap;
