# Captura de IP -> Baserow

Projeto já adaptado ao CSV fornecido.

## Tabela identificada pelo CSV

Campos:

- id
- Name
- Notes
- Active
- IP
- Date
- details

O endpoint grava somente:

- `IP`
- `Date`

Os demais campos permanecem com os valores padrão da tabela.

## Como funciona

1. O navegador consulta o IP público em `https://api64.ipify.org?format=json`.
2. Envia o IP para `/api/register-ip`.
3. O backend procura automaticamente uma tabela chamada `detalhe`.
4. Se o token só enxergar uma única tabela, ela é usada como fallback.
5. O backend cria a linha no Baserow.

## Deploy

O projeto está pronto para Vercel.

Estrutura:

```text
index.html
api/
  _config.js
  register-ip.js
vercel.json
```

### Recomendado para produção

O token solicitado foi colocado apenas no código server-side para deixar o pacote
pré-configurado. O navegador não recebe o token.

Ainda assim, o ideal é mover o token para uma variável de ambiente da Vercel:

`BASEROW_TOKEN`

Depois remova o valor fallback de `api/_config.js`.

Se a descoberta automática da tabela não funcionar com as permissões do token,
adicione também:

`BASEROW_TABLE_ID=12345`

O Table ID aparece no Baserow em:

Database -> ⋮ -> View API Docs

ou na URL:

`/database/ID_DO_DATABASE/table/TABLE_ID/...`

## Privacidade

Endereços IP podem constituir dados pessoais conforme o contexto de uso.
Defina finalidade, retenção e transparência adequadas para o seu caso.


## Configuração final

A URL informada foi:

`https://baserow.io/database/570376/table/1221352/2426603`

Identificadores:

- Database ID: `570376`
- Table ID: `1221352`
- View ID: `2426603`

O backend agora usa diretamente `TABLE_ID=1221352`, sem depender da descoberta automática da tabela.


## V2 - correção do erro 502

Alterações:

- `Date` agora é enviado como `YYYY-MM-DD`.
- Se `Date` ainda for rejeitado com HTTP 400, o endpoint tenta automaticamente registrar apenas `IP`.
- O JSON de erro agora retorna `baserowStatus` e `baserowError` para diagnóstico.
- O erro 404 de favicon foi removido com favicon vazio inline.
- Table ID permanece fixo em `1221352`.


## V3 — correção definitiva do Table ID

O erro real retornado pelo Baserow foi:

`URL /api/database/rows/table/detalhe/ not found.`

Isso prova que o deployment estava usando `detalhe` como `BASEROW_TABLE_ID`.
Nesta versão o ID foi fixado diretamente no backend:

`1221352`

A variável de ambiente `BASEROW_TABLE_ID` é ignorada por esta versão.


## V4 — geolocalização por IP

Agora, após obter o IP, o backend consulta ipapi.co e grava no campo `details`:

- Cidade
- Estado/região
- UF/código de região
- País
- Código do país
- CEP aproximado
- Latitude
- Longitude
- Timezone
- ASN
- Provedor/organização

O campo `IP` continua recebendo o endereço IP e `Date` recebe a data.
A localização por IP é aproximada e não corresponde necessariamente à localização física exata do dispositivo.
