const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { exec } = require("child_process");
const Jimp = require('jimp');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");

const router = express.Router();

// Set up file upload using multer
const upload = multer({ dest: 'uploads/' });

function removeFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

router.post('/', upload.single('image'), async (req, res) => {
    let num = req.body.number;

    async function changeProfilePicture() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let AmeenPP = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: state.keys,
                },
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!AmeenPP.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await AmeenPP.requestPairingCode(num);
                return res.status(200).json({ code });
            }

            // Image processing
            const imgPath = req.file.path;
            const jimpImage = await Jimp.read(imgPath);
            const croppedImage = jimpImage.crop(0, 0, jimpImage.getWidth(), jimpImage.getHeight());
            const imgBuffer = await croppedImage.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG);

            AmeenPP.ev.on('creds.update', saveCreds);
            AmeenPP.ev.on("connection.update", async (s) => {
                const { connection } = s;
                if (connection === "open") {
                    const userJid = jidNormalizedUser(AmeenPP.user.id);

                    // Send profile picture update
                    await AmeenPP.query({
                        tag: 'iq',
                        attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'w:profile:picture' },
                        content: [{ tag: 'picture', attrs: { type: 'image' }, content: imgBuffer }],
                    });

                    // Send success message
                    await AmeenPP.sendMessage(userJid, {
                        text: 'Profile picture updated successfully!',
                    });

                    // Clean up session and logout
                    await delay(5000);
                    await AmeenPP.logout();
                    removeFile(imgPath); // Remove the uploaded image
                    return res.status(200).json({ message: 'Profile picture updated and logged out' });
                }
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'An error occurred' });
        }
    }

    return await changeProfilePicture();
});

module.exports = router;
