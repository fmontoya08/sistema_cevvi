import React, { useState } from "react";
import axios from "axios";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:3001/login", {
        email,
        password,
      });
      console.log("Token:", response.data.token);
      alert("¡Login exitoso!");
      // Aquí guardarías el token en localStorage
    } catch (error) {
      console.error("Error en el login:", error);
      alert("Error: " + error.response.data);
    }
  };

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif" }}>
      <h2>Iniciar Sesión (Web)</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", marginBottom: "10px" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", marginBottom: "10px" }}
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default App;
