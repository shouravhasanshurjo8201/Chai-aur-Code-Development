import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is required");
    }

    const connectionInstance = await mongoose.connect(uri, { dbName: DB_NAME });
    console.log(`MongoDB connected. DB host: ${connectionInstance.connection.host}`);
};

export default connectDB;