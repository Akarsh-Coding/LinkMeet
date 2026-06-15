import dotenv from "dotenv";
if (process.env.NODE_ENV != "production") {
    // require('dotenv').config();
    dotenv.config();
}

import express from "express";
import { createServer } from "node:http";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import UserRoutes from "./routes/users.routes.js"

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.use(cors());

// const dns = require("dns");
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const PORT = process.env.PORT || 8000;
const dbUrl = process.env.ATLASDB_URL;

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));


app.use("/api/v1/users", UserRoutes);


const start = async () => {
    // console.log("ATLASDB_URL:", process.env.ATLASDB_URL);
    const connectionDb = await mongoose
        .connect(dbUrl)
        .then(() => {
            console.log("DB Connected");
        })
        .catch((err) => {
            console.log(err);
        });
    // console.log(`Mongo Connected DB Host: ${connectionDb.connection.host}`)
    server.listen(PORT, () => {
        console.log(`App started on port ${PORT}!`);
    });
};

start();
