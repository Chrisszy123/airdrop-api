const express = require('express');
const router = express.Router() 
const UserAirdropController = require('../controllers/userAirdropController')
const AirdropController = require("../controllers/airdropController")

router.post("/user-airdrop", UserAirdropController.processAirdrop)
router.post("/airdrop", AirdropController.processTransfers)

module.exports = router