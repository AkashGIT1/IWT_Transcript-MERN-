// Import required modules
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const userschema=require('./models/mongooseconfig')

const app = express();
const PORT = 3000;
const MONGO_URI = "mongodb://localhost:27017/nitk_transcripts";

app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'public')))


//form submit in get marksheet
app.post('/cal', async function(req, res) {
  try {
    const { name, fname, rollno, coursename, sub1, marks1, sub2, marks2, sub3, marks3, sub4, marks4, sub5, marks5 } = req.body;

    // Calculate CGPA before saving
    const gp = mark => (mark >= 85 ? 10 : mark >= 75 ? 9 : mark >= 65 ? 8 : mark >= 45 ? 6 : mark >= 35 ? 4 : 0);
    
    const subjects = [
      { subject: sub1, marks: Number(marks1) },
      { subject: sub2, marks: Number(marks2) },
      { subject: sub3, marks: Number(marks3) },
      { subject: sub4, marks: Number(marks4) },
      { subject: sub5, marks: Number(marks5) }
    ];

    const totalGp = subjects.reduce((sum, sub) => sum + gp(sub.marks), 0);
    const cgpa = (totalGp / subjects.length).toFixed(2);

    // Create or update user with calculated CGPA
    let user = await userschema.findOneAndUpdate(
      { rollno },
      {
        name,
        fname,
        rollno,
        course: coursename,
        cgpa,
        sub: subjects
      },
      { upsert: true, new: true }
    );

    res.redirect(`/profile?rollno=${user.rollno}`);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send("Error processing registration");
  }
});

//profile
app.get('/profile', async function (req, res) {
  let users = await userschema.find();

  users = users.map(user => {
      let totalgp = 0;
      const gp = (mark) => {
          if (mark >= 85) return 10;
          if (mark >= 75) return 9;
          if (mark >= 65) return 8;
          if (mark >= 45) return 6;
          if (mark >= 35) return 4;
          return 0;
      };

      user.sub.forEach(subject => {
          totalgp += gp(subject.marks);
      });

      user.cgpa = (user.sub.length > 0) ? (totalgp / user.sub.length).toFixed(2) : "N/A";
      return user;
  });

  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.get("/api/profile/:rollno", async (req, res) => {
  try {
    let user = await userschema.findOne({ rollno: req.params.rollno });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ensure CGPA is calculated if missing
    if (!user.cgpa) {
      const gp = mark => {
        if (mark >= 85) return 10;
        if (mark >= 75) return 9;
        if (mark >= 65) return 8;
        if (mark >= 45) return 6;
        if (mark >= 35) return 4;
        return 0;
      };

      let totalgp = 0;
      user.sub.forEach(subject => {
        totalgp += gp(subject.marks);
      });

      user.cgpa = user.sub.length > 0 ? (totalgp / user.sub.length).toFixed(2) : "N/A";
      
      // Save the calculated CGPA
      await user.save();
    }

    res.json({
      ...user._doc,
      cgpa: user.cgpa || "N/A" // Fallback if still missing
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/view-profile', async (req, res) => {
  try {
      const { rollno } = req.query;
      
      if (!rollno) {
          return res.status(400).send("Roll number is required");
      }

      // Redirect to profile page
      res.redirect(`/profile?rollno=${rollno}`);
  } catch (error) {
      console.error("Profile view error:", error);
      res.status(500).send("Error viewing profile");
  }
});



//transcript

app.get('/marksheet/:rollno', async function(req, res) {
  try {
      const rollno = req.params.rollno || req.query.rollno;
      if (!rollno) {
          return res.status(400).json({ error: "Roll number is required" });
      }

      let user = await userschema.findOne({ rollno: rollno });

      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }

      if (!user.sub || user.sub.length === 0) {
          return res.status(404).json({ error: "No subject data found" });
      }

      res.json({
          name: user.name,
          fname: user.fname,
          rollno: user.rollno,
          course: user.course || "N/A",
          sub: user.sub
      }); 
  } catch (error) {
      console.error("Error fetching marksheet:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// Serve marksheet.html as a static file
app.use(express.static(path.join(__dirname, 'public')));

app.get('/marksheetpage', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'marksheet.html'));
});




// Connect to `nitk_transcripts` database
const nitkTranscriptsDB = mongoose.createConnection("mongodb://localhost:27017/nitk_transcripts", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Define Mongoose Schema
const transcriptSchema = new mongoose.Schema({
    name: String,
    rollNumber: String,
    email: String,
    year: String,
    sgpa: [0,0,0,0,0,0],
    cgpa: Number
});

const TranscriptRequest = nitkTranscriptsDB.model("TranscriptRequest", transcriptSchema);

// Serve the form
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

//let get marksheet
app.get("/get-marksheet",(req,res)=>{
  res.sendFile(path.join(__dirname,"public", "main.html"))
})

//isme sgpa calculation hogi
app.get("/sgpa-calculator", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "sgpa.html"));
});
//for the search of transcipt data
app.get("/search-transcript", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "search_transcript.html"));
});

app.post("/submit-marksheet", async (req, res) => {
  try {
      console.log("Received request:", req.body);  // Debug request body

      const { rollNumber, subjects } = req.body;
      if (!rollNumber || !subjects || subjects.length === 0) {
          return res.status(400).json({ error: "All fields are required" });
      }

      const totalMarks = subjects.reduce((sum, subject) => sum + subject.marks, 0);
      const percentage = totalMarks / subjects.length;
      const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : "C";

      console.log("Saving to database...");  // Debug before saving

      const newMarksheet = new MarksheetRequest({ rollNumber, subjects, totalMarks, percentage, grade });
      await newMarksheet.save();

      console.log("Saved successfully:", newMarksheet);  // Debug after saving
      res.json({ message: "Marksheet submitted successfully", marksheet: newMarksheet });

  } catch (error) {
      console.error("Error submitting marksheet:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
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
        res.send(`
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Success - MCA Transcript Request</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    background-color: #f0f8ff;
                    color: #333;
                    text-align: center;
                    padding: 50px;
                  }
                  h1 {
                    font-size: 24px;
                    color: #4CAF50;
                    margin-bottom: 20px;
                  }
                  .message {
                    background-color: #e8f5e9;
                    border: 1px solid #4CAF50;
                    padding: 20px;
                    display: inline-block;
                    border-radius: 10px;
                    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
                  }
                  .cgpa {
                    font-weight: bold;
                    color: #388e3c;
                    font-size: 20px;
                  }
                  .home-button {
                    background-color: #ffcc00;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    text-decoration: none;
                    font-size: 16px;
                    margin-top: 20px;
                  }
                  .home-button:hover {
                    background-color: #ffb800;
                  }
                </style>
              </head>
              <body>
                <h1>MCA Transcript Request Submitted Successfully!</h1>
                <div class="message">
                  <p>Your CGPA is: <span class="cgpa">${cgpa.toFixed(2)}</span></p>
                </div>
                <a href="/" class="home-button">Go Back to Home</a>
              </body>
            </html>
          `);
          
    } catch (error) {
        res.status(500).send("Error submitting request");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});