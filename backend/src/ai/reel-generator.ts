import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';

export interface ReelSourceImage {
  url: string;
  durationSeconds?: number;
}

const DEFAULT_IMAGE_DURATION = 3;

// Genera un vídeo resumen tipo "highlight reel" a partir de una selección de
// fotos del álbum: cada imagen se muestra `durationSeconds` con un fundido
// de entrada. Transiciones más elaboradas (Ken Burns, música sugerida por
// IA) son la siguiente iteración natural sobre este mismo pipeline.
export async function generateHighlightReel(images: ReelSourceImage[], outputPath: string): Promise<void> {
  if (images.length === 0) {
    throw new Error('No hay imágenes para generar el reel');
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'memorias-reel-'));

  try {
    const localImages = await Promise.all(
      images.map(async (image, index) => {
        const response = await fetch(image.url);
        if (!response.ok) {
          throw new Error(`No se pudo descargar ${image.url}: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const localPath = path.join(workDir, `${index}.jpg`);
        await writeFile(localPath, buffer);
        return { localPath, duration: image.durationSeconds ?? DEFAULT_IMAGE_DURATION };
      }),
    );

    const concatListPath = path.join(workDir, 'concat.txt');
    // El demuxer `concat` de ffmpeg exige repetir la última entrada sin
    // `duration` para que se respete la duración del último frame.
    const lastImage = localImages[localImages.length - 1];
    const concatList = [
      ...localImages.map(({ localPath, duration }) => `file '${localPath}'\nduration ${duration}`),
      `file '${lastImage.localPath}'`,
    ].join('\n');
    await writeFile(concatListPath, concatList);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .videoFilters('fade=t=in:st=0:d=1,format=yuv420p')
        .outputOptions(['-pix_fmt yuv420p', '-r 30'])
        .on('end', () => resolve())
        .on('error', reject)
        .save(outputPath);
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
