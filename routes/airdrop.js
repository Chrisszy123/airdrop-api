const express = require('express');
const router = express.Router() 
const UserAirdropController = require('../controllers/userAirdropController')
const AirdropController = require("../controllers/airdropController")
const UserSubscription = require("../controllers/userSubscriptions")
const GetPlan = require("../controllers/getPlans");
const UserController = require('../controllers/userController');

router.post("/create-user", UserController.createUserProfile)
router.post("/user-airdrop", UserAirdropController.processUserAirdrop)
router.post("/airdrop", AirdropController.processTransfers)

// subscription endpoints
router.get("/user-subscription", UserSubscription.getSubscription)
router.get("/get-plans", GetPlan.getPlan)

module.exports = router