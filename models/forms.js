const mongoose = require("mongoose"),
    ObjectId = mongoose.Schema.Types.ObjectId,
    PassportLocalStrategy = require('passport-local').Strategy;


const passportLocalMongoose = require("passport-local-mongoose");

const form = new mongoose.Schema({
    country: {
        type: String,
        required: true,
        unique: false
    },
    state: {
        type: String,
        required: true,
        unique: false
    },
    city: {
        type: String,
        required: true,
        unique: false
    },
    typeOfService: {
        type: String,
        required: true,
        unique: false
    },
    senderEmail: {
        type: String,
        required: true,
        unique: true
    },
    senderNumber: {
        type: String,
        required: true,
        unique: true
    },
    created: {
        type: Date,
        required: true,
        unique: false
    }
})

form.plugin(passportLocalMongoose);

module.exports = mongoose.model("forms", form);