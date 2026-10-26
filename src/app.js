import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ?? false,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get('/', (_, res) => {
    res.status(200).json({ message: "Server running" });
});

app.use("/api/v1/users", userRouter);
app.use(errorHandler);

export { app };