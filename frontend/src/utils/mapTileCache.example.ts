/**
 * Example: How to use mapTileCache in your map components
 * 
 * Replace direct fetch calls with cacheMapTile for automatic caching
 */

import { cacheMapTile } from '../utils/mapTileCache';

// Example 1: In a custom tile layer
const CustomTileLayer = () => {
    const getTileUrl = (x: number, y: number, z: number) => {
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    };

    const loadTile = async (x: number, y: number, z: number) => {
        const url = getTileUrl(x, y, z);
        const response = await cacheMapTile(url);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    };

    // Use loadTile() in your tile rendering logic
};

// Example 2: With Leaflet
import L from 'leaflet';

const createCachedTileLayer = () => {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        // Leaflet will automatically use browser cache for tiles
        // Our cacheMapTile provides additional control and longer cache duration
    });
};

// Example 3: Manual tile caching for custom map implementations
const preloadMapTiles = async (bounds: any, zoomLevel: number) => {
    const tiles = calculateTilesInBounds(bounds, zoomLevel);

    await Promise.all(
        tiles.map(({ x, y, z }) => {
            const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
            return cacheMapTile(url);
        })
    );

    console.log('Map tiles preloaded and cached');
};

function calculateTilesInBounds(bounds: any, zoom: number) {
    // Calculate which tiles are needed for the given bounds
    // Implementation depends on your map library
    return [];
}

export { createCachedTileLayer, preloadMapTiles };
