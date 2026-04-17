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

// ============ EMAIL CONFIGURATION (Your Gmail) ============
// IMPORTANT: You need to create an App Password for Gmail
// Go to: https://myaccount.google.com/apppasswords
const emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "karthikram1391@gmail.com",
        pass: "gsbisdrdqoyzqoln"  // ⚠️ REPLACE with your Gmail App Password
    }
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============= EMAIL OTP ENDPOINT =============
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.json({ success: false, message: "Email required" });
    }

    const otp = generateOTP();

    otpStore[`email_${email}`] = {
        otp,
        expiry: Date.now() + 5 * 60 * 1000
    };

    try {
        await emailTransporter.sendMail({
            from: "karthikram1391@gmail.com",
            to: email,
            subject: "Your OTP Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #2563eb;">🔐 Email Verification</h2>
                    <p>Your OTP code is:</p>
                    <div style="font-size: 36px; font-weight: bold; padding: 20px; background: #f3f4f6; border-radius: 10px; text-align: center; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p>This code is valid for <strong>5 minutes</strong>.</p>
                    <hr style="margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        console.log(`\n📧 Email OTP sent to ${email}: ${otp}`);
        res.json({ success: true, message: `OTP sent to ${email}` });
    } catch (err) {
        console.error("Email error:", err);
        res.json({ success: false, message: "Failed to send OTP. Check App Password configuration." });
    }
});

// ============= MOBILE OTP ENDPOINT (FREE - Shows OTP on Screen & Console) =============
app.post("/send-sms-otp", async (req, res) => {
    const { mobile, countryCode, number } = req.body;
    const fullMobile = mobile || (countryCode + number);
    const cleanMobile = fullMobile.replace(/\s/g, '');

    if (!cleanMobile) {
        return res.json({ success: false, message: "Mobile number required" });
    }

    const otp = generateOTP();

    otpStore[`mobile_${cleanMobile}`] = {
        otp,
        expiry: Date.now() + 5 * 60 * 1000
    };

    // For FREE testing: Show OTP in console
    console.log(`\n📱 =========================================`);
    console.log(`📱 MOBILE OTP for ${cleanMobile}: ${otp}`);
    console.log(`📱 Valid for 5 minutes`);
    console.log(`📱 =========================================\n`);

    // Return OTP in response for easy testing (remove in production)
    res.json({ 
        success: true, 
        message: `OTP generated for ${cleanMobile}`,
        demoOtp: otp  // Shows OTP on screen for easy testing
    });
});

// ============= VERIFY OTP (Works for both Email & Mobile) =============
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    
    // Try email verification first
    let record = otpStore[`email_${email}`];
    let type = "email";
    
    // If not found, try mobile verification
    if (!record) {
        const cleanMobile = email.replace(/\s/g, '');
        record = otpStore[`mobile_${cleanMobile}`];
        type = "mobile";
    }

    if (!record) {
        return res.json({ success: false, message: "No OTP found. Request a new one." });
    }

    if (Date.now() > record.expiry) {
        delete otpStore[`${type}_${email}`];
        return res.json({ success: false, message: "OTP expired. Please request again." });
    }

    if (record.otp === otp) {
        delete otpStore[`${type}_${email}`];
        return res.json({ success: true, message: `${type === "email" ? "Email" : "Mobile"} verified successfully!` });
    } else {
        return res.json({ success: false, message: "Invalid OTP. Please try again." });
    }
});

app.post("/verify-sms-otp", (req, res) => {
    const { mobile, otp, countryCode, number } = req.body;
    const fullMobile = mobile || (countryCode + number);
    const cleanMobile = fullMobile.replace(/\s/g, '');
    
    const record = otpStore[`mobile_${cleanMobile}`];

    if (!record) {
        return res.json({ success: false, message: "No OTP found. Request a new one." });
    }

    if (Date.now() > record.expiry) {
        delete otpStore[`mobile_${cleanMobile}`];
        return res.json({ success: false, message: "OTP expired. Please request again." });
    }

    if (record.otp === otp) {
        delete otpStore[`mobile_${cleanMobile}`];
        return res.json({ success: true, message: "Mobile verified successfully!" });
    } else {
        return res.json({ success: false, message: "Invalid OTP. Please try again." });
    }
});

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of Object.entries(otpStore)) {
        if (now > value.expiry) {
            delete otpStore[key];
            console.log(`Cleaned up expired OTP for ${key}`);
        }
    }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`\n🚀 =========================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🚀 =========================================`);
    console.log(`\n📧 Email OTP: karthikram1391@gmail.com`);
    console.log(`📱 Mobile OTP: 9611459960`);
    console.log(`\n💡 Mobile OTP will appear:`);
    console.log(`   - In your server terminal (above)`);
    console.log(`   - On the webpage (Demo mode)`);
    console.log(`\n⚠️  For Email OTP, you need to:`);   
    console.log(`   1. Go to https://myaccount.google.com/apppasswords`);
    console.log(`   2. Generate an App Password`);
    console.log(`   3. Replace 'YOUR_APP_PASSWORD' in this file`);
    console.log(`\n✅ Server is ready! Open http://localhost:5000\n`);
});