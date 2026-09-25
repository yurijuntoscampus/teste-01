# Baserow IP Capture — V5 / IP2Location.io

Configuração já preservada:
- Baserow Table ID: `1221352`
- Campos usados: `IP`, `Date`, `details`

## IP2Location.io

A integração usa:

`https://api.ip2location.io/?ip=<IP>&format=json`

Para usar sua conta/plano, configure na Vercel:

`IP2LOCATION_API_KEY=<sua-chave>`

O backend envia a chave como Bearer Token. A chave nunca vai para o navegador.

Sem a variável, o código tenta o modo keyless do IP2Location.io, sujeito à cota pública.

## Dados gravados em details

Conforme disponíveis no plano:
- cidade
- distrito
- estado/região
- país
- CEP
- latitude/longitude
- timezone
- ASN / AS
- ISP
- domínio
- tipo de uso
- tipo/velocidade da rede
- operadora móvel / MCC / MNC
- indicação de proxy

## Tolerância a falhas

Se IP2Location.io estiver indisponível ou sem cota, o acesso NÃO é perdido:
o backend ainda grava `IP` e `Date`, e `details` recebe a mensagem da falha.

## Deploy

Suba o projeto na Vercel e configure `IP2LOCATION_API_KEY` em:

Settings -> Environment Variables

Depois faça um novo deployment.
