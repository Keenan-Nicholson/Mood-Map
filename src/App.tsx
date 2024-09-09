import { useEffect, useState } from "react";
import "./App.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MoodPrompt } from "./MoodPrompt";

const mapkey = import.meta.env.VITE_MAPTILER_KEY;

class MoodButtonControl implements maplibregl.IControl {
  private _container!: HTMLDivElement;
  private _button!: HTMLButtonElement;
  private _image!: HTMLImageElement;
  private _onClick: () => void;

  constructor(onClick: () => void) {
    this._onClick = onClick;
  }

  onAdd(): HTMLElement {
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl";

    this._button = document.createElement("button");
    this._button.className = "mood-button";

    this._image = document.createElement("img");
    this._image.src = "./src/assets/transparent-flower.png";
    this._image.alt = "mood";
    this._image.style.width = "80px";
    this._image.style.height = "80px";

    this._button.appendChild(this._image);

    this._container.appendChild(this._button);

    this._button.addEventListener("click", this._onClick);

    return this._container;
  }

  onRemove(): void {
    if (this._container) {
      this._container.parentNode?.removeChild(this._container);
      this._container = null!;
    }
  }
}

const postMoodRating = async (
  mood: number,
  userLocation: { lat: number; lon: number }
) => {
  const geojsonFeature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [userLocation.lon, userLocation.lat],
    },
    properties: {
      name: mood,
    },
  };
  try {
    const response = await fetch("http://127.0.0.1:3000/moods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geojsonFeature),
    });

    if (!response.ok) {
      throw new Error("Failed to post mood rating");
    }

    const data = await response.json();
  } catch (error) {
    console.error(error);
  }
};

function App() {
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const handleMoodButtonClick = () => {
    setShowMoodPrompt(true);
  };

  const handleMoodSubmit = (formData: { mood: number }) => {
    if (!userLocation) {
      console.error("User location not available");
      return;
    }
    postMoodRating(formData.mood, userLocation);
    setShowMoodPrompt(false);
  };

  const handleMoodClose = () => {
    setShowMoodPrompt(false);
  };

  useEffect(() => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/streets/style.json?key=${mapkey}`,
      center: [0, 0],
      zoom: 1,
    });

    map.on("style.load", async () => {
      const moods = await fetch("http://127.0.0.1:3000/moods");
      const moodsData = await moods.json();

      const moodsFeatureCollection = {
        type: "FeatureCollection",
        features: moodsData.map((mood: any) => {
          return {
            type: "Feature",
            geometry: mood.geometry,
            properties: {
              ...mood,
              geometry: undefined,
            },
          };
        }),
      } as any;

      map.addSource("moods", {
        type: "geojson",
        data: moodsFeatureCollection,
      });

      map.addLayer({
        id: "moods-heat",
        type: "heatmap",
        source: "moods",
        maxzoom: 9,
        paint: {
          // Increase the heatmap weight based on frequency and property magnitude
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "name"],
            1,
            0.1,
            10,
            1,
          ],
          // Increase the heatmap color weight weight by zoom level
          // heatmap-intensity is a multiplier on top of heatmap-weight
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            9,
            3,
          ],
          // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
          // Begin color ramp at 0-stop with a 0-transparency color
          // to create a blur-like effect.
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(178,24,43,0)",
            0.2,
            "rgb(244,165,130)",
            0.4,
            "rgb(253,219,199)",
            0.6,
            "rgb(217,239,139)",
            0.8,
            "rgb(120,198,121)",
            1,
            "rgb(35,139,69)",
          ],
          // Adjust the heatmap radius by zoom level
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
          // Transition from heatmap to circle layer by zoom level
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
        },
      });

      map.addLayer({
        id: "moods-point",
        type: "circle",
        source: "moods",
        minzoom: 7,
        paint: {
          // Size circle radius by moods magnitude and zoom level
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            ["interpolate", ["linear"], ["get", "name"], 1, 1, 10, 3],
            16,
            ["interpolate", ["linear"], ["get", "name"], 1, 5, 6, 25],
          ],
          // Color circle by moods magnitude
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "name"],
            1,
            "rgb(178,24,43, 0.5)",
            2,
            "rgb(214,96,77, 0.5)",
            3,
            "rgb(244,165,130, 0.5)",
            4,
            "rgb(253,219,199, 0.5)",
            5,
            "rgb(255,237,160, 0.5)",
            6,
            "rgb(217,239,139, 0.5)",
            7,
            "rgb(173,221,142, 0.5)",
            8,
            "rgb(120,198,121, 0.5)",
            9,
            "rgb(67,162,76, 0.5)",
            10,
            "rgb(35,139,69, 0.5)",
          ],
          "circle-stroke-color": "white",
          "circle-stroke-width": 1,
          // Transition from heatmap to circle layer by zoom level
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1],
        },
      });
    });

    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        maximumAge: 0,
      },
      trackUserLocation: true,
    });

    geolocateControl.on("geolocate", (e) => {
      const { latitude: lat, longitude: lon } = e.coords;
      setUserLocation({ lat, lon });
    });

    map.addControl(geolocateControl, "bottom-right");
    map.addControl(new MoodButtonControl(handleMoodButtonClick), "top-left");

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div>
      <div id="map" style={{ width: "100%", height: "98vh" }}></div>
      {showMoodPrompt && (
        <MoodPrompt onSubmit={handleMoodSubmit} onClose={handleMoodClose} />
      )}
    </div>
  );
}

export default App;
