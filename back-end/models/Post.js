const mongoose = require('mongoose')

const PostSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    timeStart: {
        type: Date,
        required: true
    },
    timeEnd: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        defualt: Date.now
    },
    images: Array
})

module.exports = mongoose.model('Posts', PostSchema)