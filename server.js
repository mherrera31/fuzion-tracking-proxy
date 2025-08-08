
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/v3', async (req, res) => {
  const tracking = req.query.tracking;

  if (!tracking) {
    return res.status(400).json({ error: 'Tracking requerido.' });
  }

  const url = `https://app.fuzioncargo.com/index.php/v3/package/${tracking}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Error HTTP ${response.status}` });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('❌ Error al consultar Fuzion:', err);
    res.status(500).json({ error: 'Error al consultar el tracking.' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy Fuzion escuchando en http://localhost:${PORT}`);
});
