require("express-async-errors");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const traceId = require("./middlewares/traceId");
const errorHandler = require("./shared/http/errorHandler");
const { AppError, ok } = require("./shared/http/response");
const adminRoutes = require("./routes/admin.routes");

const app = express();

const corsOptions = {
    origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes("*") || env.CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
};

morgan.token("traceid", (req) => req.traceId || "-");

app.set("trust proxy", true);
app.use(traceId);
app.use(morgan(":method :url :status :response-time ms traceId=:traceid"));
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: env.REQUEST_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: env.REQUEST_SIZE_LIMIT }));
app.use("/public", express.static(path.join(process.cwd(), "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.get("/health", (_req, res) => {
    return ok(res, {
        code: "HEALTH_OK",
        data: { status: "up" },
    });
});

app.use("/v1/admin", adminRoutes);

app.use((_req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", "Route not found"));
});

app.use(errorHandler);

module.exports = app;
