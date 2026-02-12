import React from "react";
import MuroDocentePage from "./MuroDocentePage";

// Por ahora reutilizamos la lógica porque ya valida el usuario,
// pero en el futuro puedes quitarle el formulario de "Publicar" si quieres que solo el profe publique.
const MuroAlumnoPage = () => {
  return <MuroDocentePage />;
};

export default MuroAlumnoPage;
