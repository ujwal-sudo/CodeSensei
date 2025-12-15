
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import githubRoutes from "./routes/github";
import { validateConnection } from "./githubClient"; // Keeping old check for now if needed, or remove
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM environments
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || "3002");
const HOST = '0.0.0.0';

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}) as any);
app.use(express.json() as any);

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/github", githubRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "CodeSensei Backend", version: "2.0" });
});

// Root Route
app.get("/", (req, res) => {
  res.send(`
    <html style="font-family: monospace; background: #020617; color: #00f3ff; display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center; border: 1px solid #1e293b; padding: 40px; border-radius: 12px; background: rgba(15, 23, 42, 0.6);">
        <h1 style="margin: 0 0 20px 0;">⚡ CodeSensei Backend</h1>
        <p style="color: #00ff9d; font-size: 1.2rem;">🟢 System Online</p>
        <p style="color: #94a3b8;">Port: ${PORT}</p>
        <div style="margin-top: 20px; text-align: left; background: #0f172a; padding: 20px; border-radius: 8px;">
          <p style="margin: 5px 0; color: #64748b;">// Endpoints</p>
          <div style="margin-bottom: 5px;">GET  <a href="/health" style="color: #bd00ff;">/health</a></div>
          <div>POST <span style="color: #bd00ff;">/api/github/import</span></div>
        </div>
      </div>
    </html>
  `);
});

app.listen(PORT, HOST, async () => {
  console.log(`\n--- SERVER STARTUP ---`);
  console.log(`🚀 CodeSensei Backend running on http://${HOST}:${PORT}`);
  console.log(`----------------------\n`);
});
