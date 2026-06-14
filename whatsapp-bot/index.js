const express = require('express');
const cors = require('cors');  // <--- importa cors
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();

app.use(cors());              // <--- permite CORS para todos los orígenes
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth()  // Guarda sesión localmente para no tener que escanear siempre
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Cliente WhatsApp listo!');

    // Aquí haces la prueba de enviar un mensaje
    client.sendMessage('593982463178@c.us', 'Mensaje de prueba desde bot')
        .then(response => console.log('Mensaje enviado:', response))
        .catch(err => console.error('Error:', err));
});


client.initialize();

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({error: 'Número y mensaje son requeridos'});
    }

    try {
        const formattedNumber = number.includes('@c.us') ? number : number + '@c.us';
        const chat = await client.sendMessage(formattedNumber, message);
        res.json({status: 'Mensaje enviado', id: chat.id._serialized});
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({error: 'No se pudo enviar el mensaje'});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en puerto ${PORT}`);
});
