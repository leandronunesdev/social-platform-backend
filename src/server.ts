import dotenv from "dotenv";
dotenv.config();

import express from "express";

const app = express();
app.use(express.json());
import authRoutes from "./routes/authRoutes";
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 4000;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
