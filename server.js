const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const PORT = 5000;

let otpStore = {};

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "karthikram1391@gmail.com",
        pass: "gsbisdrdqoyzqoln"
    }
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email required" });
    }

    const otp = generateOTP();

    otpStore[email] = {
        otp,
        expiry: Date.now() + 5 * 60 * 1000
    };

    try {
        await transporter.sendMail({
            from: "karthikram1391@gmail.com",
            to: email,
            subject: "Your OTP Code",
            html: `<h3>Your OTP is: ${otp}</h3><p>Valid for 5 minutes</p>`
        });

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        res.json({ success: false, message: "Failed to send OTP" });
    }
});

app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    const record = otpStore[email];

    if (!record) {
        return res.json({ success: false, message: "No OTP found" });
    }

    if (Date.now() > record.expiry) {
        delete otpStore[email];
        return res.json({ success: false, message: "OTP expired" });
    }

    if (record.otp === otp) {
        delete otpStore[email];
        return res.json({ success: true, message: "OTP verified successfully" });
    } else {
        return res.json({ success: false, message: "Invalid OTP" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
