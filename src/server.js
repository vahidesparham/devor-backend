const app = require("./app");
const env = require("./config/env");
const prisma = require("./prisma");
const {
    startClassifiedExpiryWorker,
} = require("./modules/classifieds-domain/classifiedExpiry.worker");

const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on port ${env.PORT}`);
});
const stopClassifiedExpiryWorker = startClassifiedExpiryWorker({
    intervalMs: env.CLASSIFIED_EXPIRY_SWEEP_INTERVAL_MS,
});

async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`${signal} received. Shutting down gracefully...`);

    stopClassifiedExpiryWorker();
    server.close(async () => {
        try {
            await prisma.$disconnect();
        } finally {
            process.exit(0);
        }
    });

    setTimeout(async () => {
        await prisma.$disconnect();
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
