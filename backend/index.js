const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const memoryStore = require("memorystore")(session);

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
    "https://moodmap.ca",
    process.env.CONNECTION_STRING,
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(cors(corsOptions));
app.use(express.json());

app.use(
  session({
    store: new memoryStore({
      checkPeriod: 86400000,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      sameSite: "none",
    },
  })
);

app.set("trust proxy", true);

app.use((req, res, next) => {
  req.clientIp = req.headers["x-forwarded-for"] || req.ip;
  next();
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1,
  message:
    "Too many requests from this session or IP, please try again after 1 minute.",
  keyGenerator: (req) => {
    const ipAddress = req.clientIp;
    return ipAddress;
  },
});

async function createTableIfNotExists() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS moods (
        id SERIAL PRIMARY KEY,
        geom GEOMETRY(POINT, 4326),
        name SMALLINT NOT NULL,
        description TEXT,
        user_ip VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log("Table created successfully or already existed");
  } catch (error) {
    console.error("Error creating table:", error);
  }
}

async function populateFakeDataInCanada(numberOfEntries = 100) {
  const minLat = 47.55833;
  const maxLat = 49.53739;
  const minLon = -57.919922;
  const maxLon = -53.613281;

  for (let i = 0; i < numberOfEntries; i++) {
    const lat = Math.random() * (maxLat - minLat) + minLat;
    const lon = Math.random() * (maxLon - minLon) + minLon;
    const mood = Math.floor(Math.random() * 5) + 1;
    const description = `This is a fake mood entry with mood ${mood}`;
    const ipAddress = "";

    try {
      const result = await pool.query(
        `INSERT INTO moods (geom, name, description, user_ip,  created_at, edited_at) 
         VALUES (ST_GeomFromGeoJSON($1), $2, $3, $4, DEFAULT, DEFAULT) 
         RETURNING id, geom, name, description, user_ip, created_at, edited_at`,
        [
          JSON.stringify({
            type: "Point",
            coordinates: [lon, lat],
          }),
          mood,
          description,
          ipAddress,
        ]
      );
      console.log(`Inserted row with id: ${result.rows[0].id}`);
    } catch (error) {
      console.error("Database insertion error:", error.message);
    }
  }
}

async function deleteTableIfExists() {
  try {
    await pool.query("DROP TABLE IF EXISTS moods");
    console.log("Table deleted successfully");
  } catch (error) {
    console.error(error);
  }
}

// deleteTableIfExists();
// populateFakeDataInCanada(500);
createTableIfNotExists();

app.post("/moods", apiLimiter, async (req, res) => {
  const { type, geometry, properties } = req.body;
  const ipAddress = req.clientIp;

  if (type !== "Feature" || !geometry || !properties || !properties.name) {
    return res.status(400).json({ error: "Invalid GeoJSON structure" });
  }

  const [lon, lat] = geometry.coordinates;
  const name = properties.name;
  const description = properties.description;

  if (name < 1 || name > 5) {
    return res.status(400).json({ error: "Invalid mood value" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO moods (geom, name, description, user_ip, created_at, edited_at) 
       VALUES (ST_GeomFromGeoJSON($1), $2, $3, $4, DEFAULT, DEFAULT) 
       RETURNING id, geom, name, description, user_ip, created_at, edited_at`,
      [
        JSON.stringify({
          type: geometry.type,
          coordinates: [lon, lat],
        }),
        name,
        description,
        ipAddress,
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
        description,
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
