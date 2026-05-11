import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", project: "zazenware" });
});

export default app;
