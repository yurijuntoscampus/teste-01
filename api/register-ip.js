import {
  BASEROW_TOKEN,
  BASEROW_BASE_URL,
  BASEROW_TABLE_ID
} from "./_config.js";

function validIp(ip) {
  return (
    typeof ip === "string" &&
    ip.length >= 3 &&
    ip.length <= 45 &&
    /^[0-9a-fA-F:.]+$/.test(ip)
  );
}

async function createBaserowRow(payload) {
  const url =
    `${BASEROW_BASE_URL}/api/database/rows/table/` +
    `${encodeURIComponent(BASEROW_TABLE_ID)}/?user_field_names=true`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();

  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = raw;
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!BASEROW_TOKEN) {
    return res.status(500).json({ error: "BASEROW_TOKEN não configurado." });
  }

  if (!BASEROW_TABLE_ID) {
    return res.status(500).json({ error: "BASEROW_TABLE_ID não configurado." });
  }

  const { ip } = req.body || {};

  if (!validIp(ip)) {
    return res.status(400).json({ error: "IP inválido." });
  }

  try {
    // Coluna Date do Baserow pode estar configurada como "date only".
    // Portanto usamos YYYY-MM-DD, que é aceito nesse tipo de campo.
    const today = new Date().toISOString().slice(0, 10);

    const payload = {
      IP: ip,
      Date: today
    };

    let result = await createBaserowRow(payload);

    // Se o campo Date estiver configurado de outra maneira, não perdemos
    // o registro do IP: tentamos novamente somente com o IP.
    if (!result.ok && result.status === 400) {
      console.error(
        "Primeira tentativa Baserow falhou:",
        JSON.stringify(result.body)
      );

      const retry = await createBaserowRow({ IP: ip });

      if (retry.ok) {
        return res.status(201).json({
          ok: true,
          rowId: retry.body?.id,
          tableId: BASEROW_TABLE_ID,
          warning: "IP registrado, mas o campo Date rejeitou o formato.",
          dateFieldError: result.body
        });
      }

      result = retry;
    }

    if (!result.ok) {
      console.error(
        "Baserow recusou o registro:",
        result.status,
        JSON.stringify(result.body)
      );

      return res.status(502).json({
        error: "O Baserow recusou o registro.",
        baserowStatus: result.status,
        baserowError: result.body
      });
    }

    return res.status(201).json({
      ok: true,
      rowId: result.body?.id,
      tableId: BASEROW_TABLE_ID
    });
  } catch (error) {
    console.error("Erro interno:", error);

    return res.status(500).json({
      error: error?.message || "Erro interno."
    });
  }
}
