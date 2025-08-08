const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

app.get('/v3/:tracking', async (req, res) => {
  const tracking = req.params.tracking;

  try {
    const response = await axios.get(`https://app.fuzioncargo.com/index.php/v3/${tracking}`);
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    if (error.response) {
      res.status(error.response.status).send(`Error: ${error.response.status} - ${error.response.statusText}`);
    } else {
      res.status(500).send("Error interno del servidor");
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy activo en el puerto ${PORT}`);
});
