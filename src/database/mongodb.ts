import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

function resolveMongoUri() {
    const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
    if (nodeEnv === "test") {
        return (process.env.MONGO_URI_TEST || process.env.MONGO_URI || "").trim();
    }
    return (process.env.MONGO_URI || "").trim();
}

export const connectDB =async()=>{
    try{
        const uri = resolveMongoUri();
        if (!uri) {
            const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
            if (nodeEnv === "test") {
                throw new Error("MongoDB URI missing. Set MONGO_URI (or MONGO_URI_TEST when NODE_ENV=test).");
            }
            console.warn("MongoDB URI missing; skipping DB connection in development.");
            return;
        }

        // Use short timeouts in development so the server can start quickly if DB is unavailable
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });

        // Keep test output clean
        if ((process.env.NODE_ENV || "").toLowerCase() !== "test") {
            console.log("MongoDB connected");
        }
        try {
            const coll = mongoose.connection.collection('stripepayments');
            try {
                await coll.dropIndex('sessionId_1');
            } catch (e) {
                // ignore if index does not exist
            }

            try {
                await coll.createIndex({ sessionId: 1 }, { sparse: true });
            } catch (e: any) {
                console.warn('Could not ensure sparse index on sessionId:', e.message || e);
            }
        } catch (idxErr: any) {
            console.warn('Index migration for stripepayments skipped:', idxErr.message || idxErr);
        }
    }catch(error){
        console.error("db error", error);
        // In development, do not exit the process so the app can start without DB.
        const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
        if (nodeEnv === "test") {
            // keep previous behavior in tests to fail fast
            process.exit(1);
        }
        console.warn("Continuing without a DB connection (development).");
    }
}