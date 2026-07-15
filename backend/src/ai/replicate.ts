const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: unknown;
  error: string | null;
}

async function replicateFetch(path: string, init?: RequestInit): Promise<ReplicatePrediction> {
  const response = await fetch(`${REPLICATE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error de la API de Replicate (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<ReplicatePrediction>;
}

// Replicate no ofrece un modo síncrono genérico: se crea la predicción y se
// hace polling hasta que termina. Pensado para invocarse desde un worker en
// segundo plano (BullMQ), nunca desde el hilo de una request HTTP.
export async function runReplicateModel(
  modelVersion: string,
  input: Record<string, unknown>,
  { pollIntervalMs = 1000, timeoutMs = 60_000 } = {},
): Promise<unknown> {
  let prediction = await replicateFetch('/predictions', {
    method: 'POST',
    body: JSON.stringify({ version: modelVersion, input }),
  });

  const deadline = Date.now() + timeoutMs;
  while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
    if (Date.now() > deadline) {
      throw new Error(`Timeout esperando la predicción de Replicate (${prediction.id})`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    prediction = await replicateFetch(`/predictions/${prediction.id}`);
  }

  if (prediction.status !== 'succeeded') {
    throw new Error(`La predicción de Replicate falló: ${prediction.error ?? 'motivo desconocido'}`);
  }

  return prediction.output;
}
