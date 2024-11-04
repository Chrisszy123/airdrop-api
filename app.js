require('dotenv').config();
const express = require('express');
const airdrop = require("./routes/airdrop")
const mongoose = require('mongoose');
const cron = require('node-cron');
const {processTransfer}  = require("./controllers/airdropController")
const bodyParser = require('body-parser');
// Initialize Express
const app = express();
app.use(bodyParser.json());
app.use("/api", airdrop)

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Set up a cron job to run the process every 24hr
cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled token transfer...');
    // checks for if they just subscribed.
    await processTransfer();
});

// Simple route to test the server
app.get('/', (req, res) => {
    res.send('Token transfer service is running.');
});

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
