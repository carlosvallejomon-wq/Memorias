'use client';

import { useQuery } from '@tanstack/react-query';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTrpc } from '@/lib/trpc-hooks';

// Estilo de demostración público de MapLibre. En producción, sustituye por
// un estilo propio (MapTiler, Stadia Maps, etc.) vía esta env var.
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';

const SOURCE_ID = 'albums';

export default function MapPage() {
  const trpc = useTrpc();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const albumsQuery = useQuery({
    queryKey: ['albums', 'listMine'],
    queryFn: () => trpc.album.listMine.query(),
  });

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      pitch: 45, // vista inclinada en vez de cenital — la aproximación "3D" de MapLibre sin datos de terreno propios
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Vuelca los álbumes geolocalizados como clusters cuando llegan/cambian.
  useEffect(() => {
    const albums = albumsQuery.data;
    if (!mapRef.current || !albums) return;
    // TS no propaga el estrechamiento de mapRef.current dentro de la
    // función anidada de más abajo, así que fijamos una referencia no-nula.
    const map: MapLibreMap = mapRef.current;

    const geolocated = albums.filter(
      (album): album is typeof album & { latitude: number; longitude: number } =>
        album.latitude != null && album.longitude != null,
    );

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: geolocated.map((album) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [album.longitude, album.latitude] },
        properties: { id: album.id, title: album.title },
      })),
    };

    function setUpLayers() {
      const existingSource = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(geojson);
        return;
      }

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#d38f2e',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
          'circle-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
        paint: { 'text-color': '#2b2320' },
      });

      map.addLayer({
        id: 'album-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#e3a94c',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.on('click', 'clusters', (event) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        if (clusterId == null) return;

        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = feature!.geometry as { type: 'Point'; coordinates: [number, number] };
          map.easeTo({ center: geometry.coordinates, zoom });
        });
      });

      map.on('click', 'album-point', (event) => {
        const albumId = event.features?.[0]?.properties?.id as string | undefined;
        if (albumId) window.location.assign(`/dashboard/${albumId}`);
      });

      map.on('mouseenter', 'album-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'album-point', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    if (map.isStyleLoaded()) {
      setUpLayers();
    } else {
      map.once('load', setUpLayers);
    }
  }, [albumsQuery.data]);

  const hasNoLocations = albumsQuery.data?.every((album) => album.latitude == null) ?? false;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mapa de álbumes</h1>
        <Link href="/dashboard" className="text-sm text-amber-600 hover:underline">
          ← Volver a tus álbumes
        </Link>
      </div>
      {hasNoLocations && (
        <p className="mb-4 text-sm text-ink/60 dark:text-cream/60">
          Ninguno de tus álbumes tiene ubicación todavía — añade latitud/longitud al crearlos para verlos aquí.
        </p>
      )}
      <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-2xl border border-amber-100" />
    </main>
  );
}
