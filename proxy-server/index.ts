import express, { Express, Request, Response } from "express";
import cors from "cors";

import prompts from "./prompts";
import proxy from "./proxy";

const app: Express = express();
const port = process.env.PORT || 3001;

const BASE_URL = (process.env.BASE_URL || "http://localhost:") + port;

app.use(cors({ origin: BASE_URL }));
app.use(express.static("../build"));
app.use("/prompts", prompts);
app.use("/proxy", proxy);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
