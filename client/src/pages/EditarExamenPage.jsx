import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const EditarExamenPage = () => {
  const { grupoId, asignaturaId, examenId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(
      `/docente/grupo/${grupoId}/asignatura/${asignaturaId}/examen/crear`,
      { state: { editarExamenId: examenId } },
    );
  }, [grupoId, asignaturaId, examenId, navigate]);

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold text-gray-700">Redirigiendo...</h1>
      <p className="text-gray-500">Cargando editor de examen...</p>
    </div>
  );
};

export default EditarExamenPage;
