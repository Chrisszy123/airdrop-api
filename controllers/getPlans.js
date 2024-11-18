const { getPlans } = require("../utils/boomFi")

const getPlan = async(req, res) => {
    try{
        const plans = await getPlans()
        console.log("TEST", plans)
        if(plans){
            res.status(200).send(plans)
        }else{
            res.status(401).json({error: "Unable to get Plans"})
        }
    }catch(err){
        console.log("Error getting plan", err)
        res.status(500).send("Error")
    }
}
module.exports = {
    getPlan
}