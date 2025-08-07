
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/track", async (req, res) => {
  const tracking = req.query.code;
  if (!tracking) {
    return res.status(400).json({ error: "Parámetro 'code' es requerido" });
  }

  try {
    const url = `https://app.fuzioncargo.com/index.php/v3/tracking/${tracking}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.tracking) {
      return res.status(404).json({ error: "Tracking no encontrado" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error en backend:", error);
    res.status(500).json({ error: "Error al consultar FuzionCargo" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend funcionando en http://localhost:${PORT}`);
});
