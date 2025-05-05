const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS))
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/user/:id", async (req, res) => {
  try {
    const userDoc = await admin.firestore().collection("users").doc(req.params.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    res.json(userDoc.data());
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
