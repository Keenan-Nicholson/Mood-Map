const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  optionsSuccessStatus: 200,
};

const pool = new Pool({
  user: "postgres",
  host: "127.0.0.1",
  password: "password",
  port: 5432,
});

app.use(cors(corsOptions));
app.use(express.json());

async function deleteTableIfExists() {
  try {
    await pool.query("DROP TABLE IF EXISTS moods");
    console.log("Table deleted successfully");
  } catch (error) {
    console.error(error);
  }
}

// deleteTableIfExists();

async function createTableIfNotExists() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS moods (
        id SERIAL PRIMARY KEY,
        geom GEOMETRY(POINT, 4326),
        name SMALLINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log("Table created successfully or already existed");
  } catch (error) {
    console.error("Error creating table:", error);
  }
}

// createTableIfNotExists();

async function populateFakeDataInCanada(numberOfEntries = 100) {
  const minLat = 47.55833;
  const maxLat = 49.53739;
  const minLon = -57.919922;
  const maxLon = -53.613281;

  for (let i = 0; i < numberOfEntries; i++) {
    const lat = Math.random() * (maxLat - minLat) + minLat; // Random latitude in Canada
    const lon = Math.random() * (maxLon - minLon) + minLon; // Random longitude in Canada
    const mood = Math.floor(Math.random() * 10) + 1; // Random mood between 1 and 10

    try {
      const result = await pool.query(
        `INSERT INTO moods (geom, name, created_at, edited_at) 
         VALUES (ST_GeomFromGeoJSON($1), $2, DEFAULT, DEFAULT) 
         RETURNING id, geom, name, created_at, edited_at`,
        [
          JSON.stringify({
            type: "Point",
            coordinates: [lon, lat],
          }),
          mood,
        ]
      );
      console.log(`Inserted row with id: ${result.rows[0].id}`);
    } catch (error) {
      console.error("Database insertion error:", error.message);
    }
  }
}

// Call the function to populate the database with Canada-based data
populateFakeDataInCanada(1000); // You can adjust the number of entries as needed

app.post("/moods", async (req, res) => {
  const { type, geometry, properties } = req.body;

  if (type !== "Feature" || !geometry || !properties || !properties.name) {
    return res.status(400).json({ error: "Invalid GeoJSON structure" });
  }

  const [lon, lat] = geometry.coordinates;
  const name = properties.name;

  try {
    const result = await pool.query(
      `INSERT INTO moods (geom, name, created_at, edited_at) 
       VALUES (ST_GeomFromGeoJSON($1), $2, DEFAULT, DEFAULT) 
       RETURNING id, geom, name, created_at, edited_at`,
      [
        JSON.stringify({
          type: geometry.type,
          coordinates: [lon, lat],
        }),
        name,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Database insertion error:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/moods", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        ST_AsGeoJSON(geom)::json AS geometry,
        name,
        created_at,
        edited_at
      FROM moods
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
