import React from "react";
import { Bar } from "react-chartjs-2"; // Ya tienes chart.js instalado

const AnaliticasGrupoPage = () => {
  // Datos de ejemplo para que se vea algo
  const data = {
    labels: ["Juan", "Maria", "Pedro", "Luisa", "Carlos"],
    datasets: [
      {
        label: "Promedio General",
        data: [85, 92, 78, 95, 88],
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Rendimiento del Grupo
      </h1>
      <div className="bg-white p-6 rounded-xl shadow-lg h-96">
        <Bar
          data={data}
          options={{ responsive: true, maintainAspectRatio: false }}
        />
      </div>
    </div>
  );
};

export default AnaliticasGrupoPage;
