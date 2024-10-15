const mongoose = require('mongoose');

const airdropSchema = mongoose.Schema({
    walletAddress: {
        type: String,
        required: true
    },
    dateOfLastAirdrop: {
        type: Date,
        required: true
    },
    amountOfLastAirdrop: {
        type: String,
        required: true
    }
})

const Airdrop = mongoose.model("Airdrop", airdropSchema)

module.exports = Airdrop