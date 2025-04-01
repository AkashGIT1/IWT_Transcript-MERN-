// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;
const MONGO_URI = "mongodb://localhost:27017/nitk_transcripts";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Define Mongoose Schema
const transcriptSchema = new mongoose.Schema({
    name: String,
    rollNumber: String,
    email: String,
    year: String,
    sgpa: [0,0,0,0,0,0],
    cgpa: Number
});

const TranscriptRequest = mongoose.model("TranscriptRequest", transcriptSchema);

// Serve the form
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

//isme sgpa calculation hogi
app.get("/sgpa-calculator", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "sgpa.html"));
});
//for the search of transcipt data
app.get("/search-transcript", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "search_transcript.html"));
});


// Route to fetch transcript based on roll number
app.get("/transcript/:rollNumber", async (req, res) => {
    try {
        const rollNumber = req.params.rollNumber;  // Extract roll number from URL
        const transcript = await TranscriptRequest.findOne({ rollNumber });  // Query database for transcript by roll number

        if (!transcript) {
            return res.status(404).json({ error: "Transcript not found" });
        }

        res.json(transcript);  // Return the transcript data as JSON
    } catch (error) {
        res.status(500).json({ error: "Error retrieving transcript" });
    }
});



// Handle form submission
app.post("/submit", async (req, res) => {
    try {
        const { name, rollNumber, email, year, sgpa1, sgpa2, sgpa3, sgpa4, sgpa5, sgpa6 } = req.body;
        const sgpa = [parseFloat(sgpa1), parseFloat(sgpa2), parseFloat(sgpa3), parseFloat(sgpa4), parseFloat(sgpa5), parseFloat(sgpa6)];
        const cgpa = sgpa.reduce((sum, val) => sum + val, 0) / sgpa.length;

        const newRequest = new TranscriptRequest({ name, rollNumber, email, year, sgpa, cgpa });
        await newRequest.save();
        res.send(`MCA Transcript request submitted successfully! Your CGPA is: ${cgpa.toFixed(2)}`);
    } catch (error) {
        res.status(500).send("Error submitting request");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
