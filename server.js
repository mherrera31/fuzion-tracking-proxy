
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/v3', async (req, res) => {
  const tracking = req.query.tracking;
  if (!tracking) {
    return res.status(400).json({ error: 'Tracking requerido.' });
  }

  try {
    const response = await fetch(`https://app.fuzioncargo.com/index.php/v3/?tracking=${tracking}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error al consultar el API de Fuzion:', error);
    res.status(500).json({ error: 'Error al consultar el tracking.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
