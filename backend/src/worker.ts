import 'reflect-metadata';
import { reelSchedulerQueue } from './queue/queues';
import { mediaProcessingWorker } from './queue/workers/media-processing.worker';
import { reelGenerationWorker } from './queue/workers/reel-generation.worker';
import { reelSchedulerWorker } from './queue/workers/reel-scheduler.worker';

// Proceso de worker independiente del servidor HTTP (src/main.ts): en
// producción se despliega como su propio contenedor/pod, escalable aparte
// de la API, para no competir por CPU con las requests.
async function bootstrap() {
  await reelSchedulerQueue.add(
    'weekly-reel-scan',
    {},
    { repeat: { pattern: '0 9 * * 1' }, jobId: 'weekly-reel-scan' },
  );

  for (const worker of [mediaProcessingWorker, reelGenerationWorker, reelSchedulerWorker]) {
    worker.on('failed', (job, error) => {
      // eslint-disable-next-line no-console
      console.error(`[${worker.name}] job ${job?.id} falló:`, error);
    });
  }

  // eslint-disable-next-line no-console
  console.log('Worker de Memorias Vivas escuchando: media-processing, reel-generation, reel-scheduler');
}

void bootstrap();
