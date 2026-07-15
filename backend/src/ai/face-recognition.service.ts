import { runReplicateModel } from './replicate';

export interface DetectedFace {
  x: number;
  y: number;
  w: number;
  h: number;
  personId?: string;
}

export interface FaceRecognitionResult {
  faces: DetectedFace[];
  // Embedding semántico de la imagen completa (no solo de las caras), usado
  // por la búsqueda "foto de la abuela en la playa" contra pgvector.
  embedding: number[];
}

// El hash de versión del modelo se configura por env var
// (REPLICATE_FACE_MODEL_VERSION) porque cambia con cada release que el
// equipo de ML elija en Replicate. Este adaptador asume una salida con forma
// `{ faces: [...], embedding: [...] }`; si el modelo elegido devuelve otro
// esquema, ajusta únicamente `parseOutput`.
export async function detectFacesAndEmbedding(imageUrl: string): Promise<FaceRecognitionResult> {
  const modelVersion = process.env.REPLICATE_FACE_MODEL_VERSION;
  if (!modelVersion) {
    throw new Error('REPLICATE_FACE_MODEL_VERSION no está configurada');
  }

  const output = await runReplicateModel(modelVersion, { image: imageUrl });
  return parseOutput(output);
}

function parseOutput(output: unknown): FaceRecognitionResult {
  if (!output || typeof output !== 'object') {
    throw new Error('Salida inesperada del modelo de reconocimiento facial');
  }

  const { faces, embedding } = output as { faces?: unknown; embedding?: unknown };

  return {
    faces: Array.isArray(faces) ? (faces as DetectedFace[]) : [],
    embedding: Array.isArray(embedding) ? (embedding as number[]) : [],
  };
}
