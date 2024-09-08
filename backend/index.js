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

// delete table moods if exists
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
        mood SMALLINT NOT NULL,
        latitude DECIMAL NOT NULL,
        longitude DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log("Table created successfully");
  } catch (error) {
    console.error(error);
  }
}

createTableIfNotExists();

app.post("/moods", async (req, res) => {
  const { mood } = req.body;
  if (mood === undefined) {
    return res.status(400).json({ error: "Mood is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO moods (mood, latitude, longitude) VALUES ($1, $2, $3) RETURNING *",
      [mood, req.body.userLocation.lat, req.body.userLocation.lon]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
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
