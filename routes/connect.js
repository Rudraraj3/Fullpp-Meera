const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, jidNormalizedUser } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/', async (req, res) => {
    const number = req.body.number.replace(/[^0-9]/g, ''); // Clean up phone number input

    // Save the uploaded image
    const image = req.files.image;
    const uploadPath = path.join(__dirname, '../uploads/', image.name);

    image.mv(uploadPath, async (err) => {
        if (err) return res.status(500).json({ message: 'Failed to upload image', error: err });

        async function startWhatsAppConnection() {
            const { state, saveCreds } = await useMultiFileAuthState('./session');
            
            let sock = makeWASocket({
                auth: state,
                logger: pino({ level: 'silent' }),
            });

            sock.ev.on('creds.update', saveCreds);

            try {
                const code = await sock.requestPairingCode(number);
                res.json({ code });
            } catch (err) {
                return res.status(500).json({ message: 'Failed to generate pairing code', error: err });
            }

            sock.ev.on("connection.update", async (update) => {
                const { connection } = update;
                if (connection === "open") {
                    const user_jid = jidNormalizedUser(sock.user.id);

                    // Read the uploaded image
                    const imageBuffer = fs.readFileSync(uploadPath);

                    // Send profile picture update
                    await sock.query({
                        tag: 'iq',
                        attrs: {
                            to: user_jid,
                            type: 'set',
                            xmlns: 'w:profile:picture',
                        },
                        content: [
                            {
                                tag: 'picture',
                                attrs: { type: 'image' },
                                content: imageBuffer,
                            },
                        ],
                    });

                    // Remove the image file after it's uploaded to WhatsApp
                    fs.unlinkSync(uploadPath);

                    // Logout after profile update
                    await sock.logout();
                }
            });
        }

        await startWhatsAppConnection();
    });
});

module.exports = router;
             
