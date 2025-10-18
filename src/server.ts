import express from "express";
import cors, { type CorsOptions } from "cors";
import dotenv from "dotenv";
import compression from "compression";
import apiRoutes from "@/routes/api";
import { connectToDb } from "@/Utility/connection";
import mongoose from "mongoose";
import type { Db } from "mongodb";

dotenv.config();

const app = express();

// ============================
//         Middleware
// ============================
app.use(express.json());
app.use(compression());

// --- CORS ---
const PROD_ORIGIN = (process.env.CLIENT_ORIGIN || "").replace(/\/+$/, "");
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(PROD_ORIGIN ? [PROD_ORIGIN] : []),
];

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("/api/*", cors(corsOptions));

console.log(
  "🌐 (content) CORS allowed origins:",
  allowedOrigins.length ? allowedOrigins.join(", ") : "(none)"
);

// ============================
//     Health/Debug Endpoints
// ============================
app.get("/api/health/cors", (req, res) => {
  const origin = req.headers.origin || "(none)";
  res.setHeader("X-Seen-Origin", String(origin));
  res.json({ ok: true, allowedOrigins, seenOrigin: origin });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const db: Db | undefined = (mongoose.connection as any).db;

    // 👉 Update these names to match your actual collection names
    const collectionsToCount = [
      "manufacturers",
      "garagelevels",
      "legendstore",
      // add others if you have them
    ];

    const counts: Record<string, number | null> = {};
    if (db && state === 1) {
      await Promise.all(
        collectionsToCount.map(async (name) => {
          try {
            counts[name] = await db.collection(name).estimatedDocumentCount();
          } catch {
            counts[name] = null; // collection may not exist yet
          }
        })
      );
    }

    let stats: any = null;
    if (db && typeof (db as any).stats === "function") {
      try {
        stats = await (db as any).stats();
      } catch {
        /* ignore */
      }
    }

    res.json({
      ok: true,
      mongoState: state, // 0=disconnected 1=connected 2=connecting 3=disconnecting
      dbName: mongoose.connection.name || null,
      counts,
      stats,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/health/runtime", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    node: process.version,
    uptimeSec: Math.round(process.uptime()),
    rssMB: Math.round(mem.rss / (1024 * 1024)),
    heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
    cwd: process.cwd(),
    envClientOrigin: process.env.CLIENT_ORIGIN || null,
  });
});

// ✅ Simple liveness
app.get("/api/test", (_req, res) => {
  res.status(200).json({ status: "alive" });
});

// ✅ API routes (manufacturers, GL, legend store, etc.)
app.use("/api", apiRoutes);

// ============================
//          Server Start
// ============================
const main = async () => {
  try {
    await connectToDb();
    console.log("✅ (content) Database connected successfully.");

    const PORT = process.env.PORT || 3002; // give it a distinct default from cars
    console.log("🔍 Binding to port:", PORT);
    app.listen(PORT, () =>
      console.log(`🚀 Content API running on port ${PORT}`)
    );
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

main().catch((error) => console.error("❌ Unexpected error:", error));