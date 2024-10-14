const airdrop = require("../routes/airdrop")

const route = (app) => {
  app.use('/api', airdrop);
};

module.exports={
    route
}