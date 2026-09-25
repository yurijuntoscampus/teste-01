import {
  BASEROW_TOKEN,
  BASEROW_BASE_URL,
  BASEROW_TABLE_ID,
  BASEROW_TABLE_NAME
} from "./_config.js";

let cachedTableId = null;

function normalizeTables(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.tables)) return data.tables;
  return [];
}

async function resolveTableId() {
  if (BASEROW_TABLE_ID) return String(BASEROW_TABLE_ID);
  if (cachedTableId) return cachedTableId;

  const response = await fetch(
    `${BASEROW_BASE_URL}/api/database/tables/all-tables/`,
    {
      method: "GET",
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("Baserow table discovery:", response.status, detail);
    throw new Error(
      "Não foi possível descobrir automaticamente a tabela no Baserow."
    );
  }

  const data = await response.json();
  const tables = normalizeTables(data);

  if (!tables.length) {
    throw new Error("Nenhuma tabela acessível foi encontrada para esse token.");
  }

  const expected = BASEROW_TABLE_NAME.trim().toLowerCase();

  const exact = tables.find(
    table => String(table.name || "").trim().toLowerCase() === expected
  );

  // Se o token só tiver acesso a uma tabela, usamos essa tabela como fallback.
  const selected = exact || (tables.length === 1 ? tables[0] : null);

  if (!selected?.id) {
    throw new Error(
      `Tabela "${BASEROW_TABLE_NAME}" não encontrada. ` +
      "Defina BASEROW_TABLE_ID no servidor."
    );
  }

  cachedTableId = String(selected.id);
  return cachedTableId;
}

function validIp(ip) {
  return (
    typeof ip === "string" &&
    ip.length >= 3 &&
    ip.length <= 45 &&
    /^[0-9a-fA-F:.]+$/.test(ip)
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ip } = req.body || {};

  if (!validIp(ip)) {
    return res.status(400).json({ error: "IP inválido." });
  }

  try {
    const tableId = await resolveTableId();

    // Campos confirmados pelo CSV anexado:
    // id, Name, Notes, Active, IP, Date, details
    //
    // Gravamos somente os dois campos necessários.
    const payload = {
      IP: ip,
      Date: new Date().toISOString()
    };

    const response = await fetch(
      `${BASEROW_BASE_URL}/api/database/rows/table/${encodeURIComponent(tableId)}/?user_field_names=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("Baserow create row:", response.status, detail);

      return res.status(502).json({
        error: "O Baserow recusou o registro.",
        status: response.status
      });
    }

    const row = await response.json();

    return res.status(201).json({
      ok: true,
      rowId: row.id,
      tableId
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error?.message || "Erro interno."
    });
  }
}
