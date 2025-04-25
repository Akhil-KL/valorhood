import React from "react";
import PlayerMap from "./components/PlayerMap";
import "./styles/App.css";

const App = () => {
  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Valorhood</h2>
      <PlayerMap />
    </div>
  );
};

export default App;
