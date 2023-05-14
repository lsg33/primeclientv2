export { };

const mongoose = require("mongoose");

const ApiSchema = new mongoose.Schema(
    {
        created: { type: Date, required: true },
        apiKey: { type: String, required: true, unique: true },
        access: { type: String, required: true, default: "user" },
    },
    {
        collection: "api"
    }
)

const model = mongoose.model('ApiSchema', ApiSchema);

module.exports = model;