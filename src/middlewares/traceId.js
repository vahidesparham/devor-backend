const { randomUUID } = require("crypto");

function traceId(req, res, next) {
    req.traceId = randomUUID();
    req._startAtHr = process.hrtime.bigint();
    res.setHeader("x-trace-id", req.traceId);

    res.on("finish", () => {
        if (req._startAtHr) {
            req.durationMs = Number(process.hrtime.bigint() - req._startAtHr) / 1e6;
        }
    });

    next();
}

module.exports = traceId;
