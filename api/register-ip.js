import {
  BASEROW_TOKEN,
  BASEROW_BASE_URL,
  BASEROW_TABLE_ID
} from "./_config.js";

function validIp(ip) {
  return typeof ip === "string" &&
    ip.length >= 3 &&
    ip.length <= 45 &&
    /^[0-9a-fA-F:.]+$/.test(ip);
}

async function lookupIp(ip) {
  const response = await fetch(
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
    {
      headers: { "Accept": "application/json" }
    }
  );

  if (!response.ok) {
    throw new Error(`IP geolocation falhou (${response.status}).`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.reason || "IP geolocation não disponível.");
  }

  return data;
}

async function createBaserowRow(payload) {
  const url =
    `${BASEROW_BASE_URL}/api/database/rows/table/` +
    `${BASEROW_TABLE_ID}/?user_field_names=true`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : null; }
  catch { body = raw; }

  return { ok: response.ok, status: response.status, body };
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
    const geo = await lookupIp(ip);

    const details = [
      `Cidade: ${geo.city || "N/D"}`,
      `Estado/Região: ${geo.region || "N/D"}`,
      `UF/Código região: ${geo.region_code || "N/D"}`,
      `País: ${geo.country_name || geo.country || "N/D"}`,
      `Código país: ${geo.country_code || geo.country || "N/D"}`,
      `CEP: ${geo.postal || "N/D"}`,
      `Latitude: ${geo.latitude ?? "N/D"}`,
      `Longitude: ${geo.longitude ?? "N/D"}`,
      `Timezone: ${geo.timezone || "N/D"}`,
      `ASN: ${geo.asn || "N/D"}`,
      `Provedor/Organização: ${geo.org || "N/D"}`
    ].join("\n");

    const payload = {
      IP: ip,
      Date: new Date().toISOString().slice(0, 10),
      details
    };

    let result = await createBaserowRow(payload);

    // Se Date estiver configurado de forma incompatível, preserva IP + details.
    if (!result.ok && result.status === 400) {
      console.error("Baserow primeira tentativa:", result.body);
      const retry = await createBaserowRow({ IP: ip, details });

      if (retry.ok) {
        return res.status(201).json({
          ok: true,
          rowId: retry.body?.id,
          city: geo.city || null,
          region: geo.region || null,
          country: geo.country_name || null,
          warning: "Registro criado sem Date."
        });
      }
      result = retry;
    }

    if (!result.ok) {
      return res.status(502).json({
        error: "O Baserow recusou o registro.",
        baserowStatus: result.status,
        baserowError: result.body
      });
    }

    return res.status(201).json({
      ok: true,
      rowId: result.body?.id,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country_name || null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "Erro interno."
    });
  }
}
