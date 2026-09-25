// CONFIGURAÇÃO SERVER-SIDE.
// Este arquivo nunca é enviado para o navegador pelo frontend.
// Recomendação para produção: mover o token para variável de ambiente.
export const BASEROW_TOKEN =
  process.env.BASEROW_TOKEN || "6Bq15TiaBbG1X73gacUdUAMwkVzf9zI2";

export const BASEROW_BASE_URL =
  process.env.BASEROW_BASE_URL || "https://api.baserow.io";

export const BASEROW_TABLE_ID = "1221352";
export const BASEROW_TABLE_NAME =
  process.env.BASEROW_TABLE_NAME || "detalhe";

export const IP2LOCATION_API_KEY =
  process.env.IP2LOCATION_API_KEY || "619FD8B4B77497A241953C4D61BB963B";
