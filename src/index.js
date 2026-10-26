import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
    .then(() => {
        const port = Number(process.env.PORT) || 8000;
        app.listen(port, () => {
            console.log(`Server is running at port: ${port}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
        process.exitCode = 1;
    });