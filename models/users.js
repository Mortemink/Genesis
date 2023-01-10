const mongoose = require("mongoose"),
    ObjectId = mongoose.Schema.Types.ObjectId,
    PassportLocalStrategy = require('passport-local').Strategy;


const passportLocalMongoose = require("passport-local-mongoose");

const users = new mongoose.Schema({
    firstName: {
        type:String,
        required:true,
        unique: false
    },
    lastName: {
        type:String,
        required:true,
        unique: false
    },
    email: {
        type:String,
        required:true,
        unique: true,
        index: true
    },
    telephone: {
        type:String,
        required:false,
        sparse: true,
        unique: true,
        index: true
    },
    password: {
        type:String,
        required:true,
        unique: false
    },
    created: {
        type: Date,
        default: Date.now,
        unique: false
    }
});
users.plugin(passportLocalMongoose);

module.exports = mongoose.model("users",users);