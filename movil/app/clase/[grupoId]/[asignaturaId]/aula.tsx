import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../../context/AuthContext'; // Nota: Ajusta la cantidad de "../" si es necesario
import { Ionicons } from '@expo/vector-icons';

export default function AulaVirtualScreen() {
  const { grupoId, asignaturaId } = useLocalSearchParams();
  const { api } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<any>(null); // Puedes definir una interfaz si prefieres
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await api.get(`/alumno/aula-virtual/${grupoId}/${asignaturaId}/config`);
      setConfig(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const abrirEnlace = () => {
    if (config?.enlace_videollamada) {
      // Abre el link (Zoom, Meet, etc.) en el navegador o app externa
      Linking.openURL(config.enlace_videollamada);
    }
  };

  if (loading) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#a72a34" />
        </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Información del Curso</Text>
      </View>

      <View style={styles.content}>
        {/* Tarjeta Destacada: Videollamada */}
        <View style={styles.cardHighlight}>
           <View style={styles.row}>
                <Ionicons name="videocam" size={28} color="#16a34a" />
                <Text style={styles.cardTitle}>Clase en Vivo</Text>
           </View>
           
           {config?.enlace_videollamada ? (
             <TouchableOpacity style={styles.joinButton} onPress={abrirEnlace}>
               <Text style={styles.joinButtonText}>Unirse a la Clase Ahora</Text>
               <Ionicons name="open-outline" size={20} color="#fff" />
             </TouchableOpacity>
           ) : (
             <Text style={styles.noLink}>El docente aún no ha configurado el enlace.</Text>
           )}

           {config?.horario && (
               <View style={styles.horarioBox}>
                   <Ionicons name="time-outline" size={16} color="#555" />
                   <Text style={styles.horarioText}>{config.horario}</Text>
               </View>
           )}
        </View>

        {/* Descripción General */}
        <View style={styles.card}>
          <Text style={styles.label}>Descripción:</Text>
          <Text style={styles.text}>{config?.descripcion_curso || "Sin descripción disponible."}</Text>
        </View>

        {/* Objetivos */}
        <View style={styles.card}>
          <Text style={styles.label}>Objetivos:</Text>
          <Text style={styles.text}>{config?.objetivos || "No especificados."}</Text>
        </View>

        {/* Evaluación */}
        <View style={styles.card}>
          <Text style={styles.label}>Criterios de Evaluación:</Text>
          <Text style={styles.text}>{config?.evaluacion || "No especificados."}</Text>
        </View>

        {/* Contacto */}
        <View style={styles.card}>
          <Text style={styles.label}>Contacto Docente:</Text>
          <Text style={styles.text}>{config?.contacto_docente || "No especificado."}</Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
  backButton: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#a72a34' },
  content: { padding: 15 },
  
  cardHighlight: {
    backgroundColor: '#dcfce7', // Verde muy claro
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#86efac'
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#14532d' },
  joinButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 3
  },
  joinButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noLink: { fontStyle: 'italic', color: '#666', marginBottom: 10 },
  horarioBox: { flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 8 },
  horarioText: { marginLeft: 5, color: '#333', fontWeight: '600' },

  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#a72a34', marginBottom: 5, textTransform: 'uppercase' },
  text: { fontSize: 15, color: '#444', lineHeight: 22 }
});