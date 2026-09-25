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

async function lookupIp2Location(ip) {
  const apiKey = process.env.IP2LOCATION_API_KEY;

  // IP2Location.io also supports keyless lookups with a limited daily quota.
  const headers = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const url =
    `https://api.ip2location.io/?ip=${encodeURIComponent(ip)}&format=json`;

  const response = await fetch(url, { headers });
  const raw = await response.text();

  let data;
  try { data = raw ? JSON.parse(raw) : {}; }
  catch { data = { raw }; }

  if (!response.ok || data?.error) {
    const message =
      data?.error?.error_message ||
      data?.error?.message ||
      data?.message ||
      data?.raw ||
      `HTTP ${response.status}`;
    throw new Error(`IP2Location.io: ${message}`);
  }

  return data;
}

function makeDetails(geo) {
  const lines = [
    `Cidade: ${geo.city_name || "N/D"}`,
    `Estado/Região: ${geo.region_name || "N/D"}`,
    `País: ${geo.country_name || "N/D"}`,
    `Código do país: ${geo.country_code || "N/D"}`,
    `CEP: ${geo.zip_code || "N/D"}`,
    `Latitude: ${geo.latitude ?? "N/D"}`,
    `Longitude: ${geo.longitude ?? "N/D"}`,
    `Timezone: ${geo.time_zone || geo.time_zone_info?.olson || "N/D"}`,
    `ASN: ${geo.asn || geo.as_info?.as_number || "N/D"}`,
    `AS: ${geo.as || geo.as_info?.as_name || "N/D"}`,
    `ISP: ${geo.isp || "N/D"}`,
    `Domínio: ${geo.domain || geo.as_info?.as_domain || "N/D"}`,
    `Tipo de uso: ${geo.usage_type || geo.as_info?.as_usage_type || "N/D"}`,
    `Velocidade/rede: ${geo.net_speed || "N/D"}`,
    `Operadora móvel: ${geo.mobile_brand || "N/D"}`,
    `MCC: ${geo.mcc || "N/D"}`,
    `MNC: ${geo.mnc || "N/D"}`,
    `Proxy: ${typeof geo.is_proxy === "boolean" ? (geo.is_proxy ? "SIM" : "NÃO") : "N/D"}`
  ];

  if (geo.district) lines.splice(1, 0, `Distrito: ${geo.district}`);

  return lines.join("\n");
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

  let geo = null;
  let geoError = null;

  try {
    geo = await lookupIp2Location(ip);
  } catch (error) {
    geoError = error?.message || "Falha de geolocalização.";
    console.error("IP2Location:", geoError);
  }

  const details = geo
    ? makeDetails(geo)
    : `Geolocalização indisponível: ${geoError}`;

  const payload = {
    IP: ip,
    Date: new Date().toISOString(),
    details
  };

  try {
    let result = await createBaserowRow(payload);

    // Se o tipo da coluna Date for incompatível, preserva IP + details.
    if (!result.ok && result.status === 400) {
      const retry = await createBaserowRow({ IP: ip, details });
      if (retry.ok) {
        result = retry;
      }
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
      geolocation: geo ? {
        city: geo.city_name || null,
        region: geo.region_name || null,
        country: geo.country_name || null,
        zip: geo.zip_code || null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        isp: geo.isp || null,
        asn: geo.asn || null
      } : null,
      geolocationError: geoError
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Erro interno."
    });
  }
}
