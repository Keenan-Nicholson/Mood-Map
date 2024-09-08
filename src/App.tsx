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

    // Create the button element
    this._button = document.createElement("button");
    this._button.className = "mood-button";

    // Create the image element
    this._image = document.createElement("img");
    this._image.src = "./src/assets/transparent-flower.png"; // Path to the image
    this._image.alt = "mood";
    this._image.style.width = "80px"; // Adjust size as needed
    this._image.style.height = "80px"; // Adjust size as needed

    // Append the image to the button
    this._button.appendChild(this._image);

    // Append the button to the container
    this._container.appendChild(this._button);

    // Add click event listener for the button
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

function App() {
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);

  // Function to handle mood button click
  const handleMoodButtonClick = () => {
    setShowMoodPrompt(true); // Show the mood prompt form
  };

  // Function to handle mood form submission
  const handleMoodSubmit = (formData: { mood: number }) => {
    console.log("Mood submitted:", formData.mood);
    setShowMoodPrompt(false); // Close the form after submission
  };

  // Function to handle closing the mood form
  const handleMoodClose = () => {
    setShowMoodPrompt(false); // Close the form without submitting
  };

  useEffect(() => {
    // Initialize the map when the component mounts
    const map = new maplibregl.Map({
      container: "map", // container id
      style: `https://api.maptiler.com/maps/streets/style.json?key=${mapkey}`, // style URL
      center: [0, 0], // starting position [lng, lat]
      zoom: 1, // starting zoom
    });

    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

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
