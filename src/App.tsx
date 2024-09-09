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
    console.log("Mood rating posted:", data);
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

      console.log({ moodsFeatureCollection });

      map.addSource("moods", {
        type: "geojson",
        data: moodsFeatureCollection,
      });

      map.addLayer({
        id: "moods",
        type: "circle",
        source: "moods",
        paint: {
          "circle-radius": 5,
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "mood"],
            1,
            "blue",
            2,
            "green",
            3,
            "yellow",
            4,
            "orange",
            5,
            "red",
          ],
        },
      });
    });

    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
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
