const mongoose = require("mongoose")

const passportLocalMongoose = require("passport-local-mongoose");

const item = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    sellerName: {
        type: String,
        required: true,
        unique: false
    },
    square: {
        type: Number,
        required: true,
        unique: false,
        default: 0
    },
    floor: {
        type: Number,
        required: true,
        unique: false,
        default: 1
    },
    floorCount: {
        type: Number,
        required: true,
        unique: false,
        default: 1
    },
    repair: {
        type: String,
        required: true,
        unique: false,
        default: 'Not required'
    },
    price: {
        type: Number,
        required: true,
        unique: false,
        default: 0
    },
    description: {
        type: String,
        required: false,
        unique: false,
        default: 'No description'
    },
    firstImage: {
        type: Object,
        required: false,
        unique: false,
        default: { mimetype: null, buffer: null }
    },
    images: {
        type: Array,
        required: false,
        unique: false,
        default: []
    },
    created: {
        type: Date,
        default: Date.now,
        unique: false
    }
});
item.plugin(passportLocalMongoose);

module.exports = mongoose.model("items",item);