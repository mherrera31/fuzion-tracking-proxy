
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/track", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: "Código de tracking no proporcionado." });
  }

  const url = `https://app.fuzioncargo.com/index.php/v3/${encodeURIComponent(code)}`;
  console.log("Consultando URL:", url);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.error("Error al consultar:", response.status, await response.text());
      return res.status(response.status).json({ error: "No encontrado o error remoto." });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error interno:", error);
    res.status(500).json({ error: "Error al procesar solicitud." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor proxy escuchando en puerto ${PORT}`);
});
