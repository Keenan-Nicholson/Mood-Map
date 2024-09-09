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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log("Table created successfully or already existed");
  } catch (error) {
    console.error("Error creating table:", error);
  }
}

createTableIfNotExists();

app.post("/moods", async (req, res) => {
  const { type, geometry, properties } = req.body;

  console.log("Request:", req.body);

  if (type !== "Feature" || !geometry || !properties || !properties.name) {
    return res.status(400).json({ error: "Invalid GeoJSON structure" });
  }

  const [lon, lat] = geometry.coordinates;

  try {
    const result = await pool.query(
      `INSERT INTO moods (geom, created_at, edited_at) 
       VALUES (ST_GeomFromGeoJSON($1), DEFAULT, DEFAULT) 
       RETURNING id, geom, created_at, edited_at`,
      [
        JSON.stringify({
          type: geometry.type,
          coordinates: [lon, lat],
        }),
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
    const result = await pool.query("SELECT * FROM moods");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
