const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

app.get('/track', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'Código requerido' });

  try {
    const url = `https://app.fuzioncargo.com/index.php/v3/tracking/${code}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Error al consultar tracking' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));