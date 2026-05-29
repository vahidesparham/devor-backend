function validate(schema, target = "body") {
    return async (req, _res, next) => {
        req[target] = await schema.parseAsync(req[target]);
        next();
    };
}

module.exports = validate;
