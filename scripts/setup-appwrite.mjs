import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SHEET_ID = '1-Jh-eCZRQn2U47jQabNRjJ8svRXI2iPrgSGFIE4wmIg'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=0&tqx=out:json`
const DATABASE_ID = 'bikes'
const TABLE_ID = 'motos'
const TABLE_PERMISSIONS = [
  'read("any")',
  'create("label:admin")',
  'update("label:admin")',
  'delete("label:admin")',
]

const imageByColumn = {
  1: 'image19.png',
  2: 'image15.png',
  3: 'image6.png',
  4: 'image3.png',
  5: 'image2.png',
  6: 'image21.png',
  7: 'image1.png',
  8: 'image10.png',
  9: 'image5.png',
  10: 'image16.png',
  11: 'image20.png',
  12: 'image9.png',
  13: 'image11.png',
  14: 'image7.png',
  15: 'image14.png',
  16: 'image12.png',
  17: 'image17.png',
  18: 'image8.png',
  19: 'image4.png',
  20: 'image13.png',
  21: 'image18.png',
}

const extraInfoByColumn = {
  1: { concessionaria: 'TBA', garantia: 'TBA' },
  2: {
    concessionaria: 'Francisco da Cruz Nunes, 4764, Piratininga, Niteroi',
    garantia: '3 anos',
    preco_revisoes: 'R$4.721,69',
    seguro: 'R$1.109,21 (Tokio Marine)',
  },
  3: {
    garantia: '3 anos',
    preco_revisoes: 'R$4.774,14',
    seguro: 'R$1.391,82 (Tokio Marine)',
  },
  4: {
    concessionaria: 'Barao de Mesquita, Loja 146, 148, Tijuca, Rio de Janeiro',
    garantia: '3 anos',
    preco_revisoes: 'R$2.305',
    seguro: 'R$5.062,87 (Tokio Marine)',
  },
  5: {
    concessionaria: 'Barao de Mesquita, Loja 146, 148, Tijuca, Rio de Janeiro',
    garantia: '3 anos',
    preco_revisoes: 'R$2.305',
    seguro: 'R$3.064,22 (Completo)',
  },
  6: {
    concessionaria: 'Alameda Sao Boaventura, 216, Fonseca, Niteroi',
    garantia: '3 anos',
    preco_revisoes: 'R$1.530',
    seguro: 'R$3.058,60 (Tokio Marine)',
  },
  7: {
    concessionaria: 'Alameda Sao Boaventura, 216, Fonseca, Niteroi',
    garantia: '3 anos',
    preco_revisoes: 'R$1.530',
  },
  8: { garantia: '3 anos' },
  9: {
    concessionaria: 'Alameda Sao Boaventura, 216, Fonseca, Niteroi',
    garantia: '3 anos',
    preco_revisoes: 'R$2.588,90',
    seguro: 'R$2.012 (Completo)',
  },
  10: { garantia: '3 anos', preco_revisoes: 'R$2.588,90' },
  11: { garantia: '3 anos' },
  12: { garantia: '3 anos', preco_revisoes: 'R$4.508,83' },
  13: {
    concessionaria: 'R. Real Grandeza, 376, Botafogo, Rio de Janeiro',
    garantia: '2 anos',
    preco_revisoes: '-',
    seguro: 'R$1.574,42 (Tokio Marine)',
  },
  14: {
    concessionaria: 'Av. Infante Dom Henrique - Marina da Gloria, Rio de Janeiro',
    garantia: '2 anos',
    preco_revisoes: 'R$2.500',
    seguro: 'R$1.708,59 (Tokio Marine)',
  },
  15: {
    concessionaria: 'Barao de Mesquita, Loja 146, 148, Tijuca, Rio de Janeiro',
    garantia: '3 anos',
    preco_revisoes: 'R$1.743',
    seguro: 'R$2.508,69 (Tokio Marine)',
  },
  16: {
    concessionaria: 'Barao de Mesquita, Loja 146, 148, Tijuca, Rio de Janeiro',
    garantia: '3 anos',
    preco_revisoes: 'R$1.743',
    seguro: 'R$1.465,96 (Suhai Top)',
  },
  17: {
    concessionaria: 'Alameda Sao Boaventura, 216, Fonseca, Niteroi',
    garantia: '3 anos',
    preco_revisoes: 'R$2.588,90',
    seguro: 'R$1.561,39 (Suhai Top)',
  },
  18: {
    concessionaria: 'Alameda Sao Boaventura, 216, Fonseca, Niteroi',
    garantia: '3 anos',
    preco_revisoes: 'R$1.530',
    seguro: 'R$2.651,65 (Completo)',
  },
  19: {
    concessionaria: 'Francisco da Cruz Nunes, Piratininga, Niteroi',
    garantia: '4 anos',
    preco_revisoes: 'R$3.720',
    seguro: 'R$2.115,11 (Completo)',
  },
  20: {
    concessionaria: 'Francisco da Cruz Nunes, Piratininga, Niteroi',
    garantia: '4 anos',
    preco_revisoes: 'R$3.720',
    seguro: 'R$1.869 (Completo)',
  },
  21: { garantia: '3 anos' },
}

const rowMap = {
  'Cilindrada (cc)': 'cilindrada',
  'Potencia (cv)': 'potencia',
  'Potência (cv)': 'potencia',
  'Consumo (km/L) (media)': 'consumo',
  'Consumo (km/L) (média)': 'consumo',
  'Peso (Kg)': 'peso',
  'Altura do assento (mm)': 'altura_assento',
  'Preco (R$)': 'preco',
  'Preço (R$)': 'preco',
  'Peso/potencia': 'peso_potencia',
  'Preco/potencia': 'preco_potencia',
  'Preço/potência': 'preco_potencia',
}

const brandPrefixes = [
  'Triumph by Bajaj',
  'Haojue by Suzuki',
  'Royal Enfield',
  'CF Moto',
  'Kawasaki',
  'Shineray',
  'Yamaha',
  'Zontes',
  'Honda',
  'Auper',
  'Haojue',
  'SBM',
  'SWM',
]

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    process.env[key] ??= value
  }
}

class AppwriteRestError extends Error {
  constructor(message, code, response) {
    super(message)
    this.code = code
    this.response = response
  }
}

function appwriteConfigFromEnv() {
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT
  const project = process.env.VITE_APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY

  if (!endpoint || !project || !apiKey) {
    throw new Error(
      'Missing VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, or APPWRITE_API_KEY.',
    )
  }

  return {
    apiKey,
    endpoint: endpoint.replace(/\/$/, ''),
    project,
  }
}

async function apiRequest(config, method, path, body) {
  const response = await fetch(`${config.endpoint}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-appwrite-key': config.apiKey,
      'x-appwrite-project': config.project,
    },
    method,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new AppwriteRestError(
      payload.message || `Appwrite request failed with ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload
}

function isCode(error, code) {
  return typeof error === 'object' && error !== null && error.code === code
}

function tablePath(path = '') {
  return `/tablesdb/${encodeURIComponent(DATABASE_ID)}/tables/${encodeURIComponent(TABLE_ID)}${path}`
}

async function ensureDatabase(config) {
  try {
    await apiRequest(config, 'GET', `/tablesdb/${encodeURIComponent(DATABASE_ID)}`)
    console.log(`Database ${DATABASE_ID} already exists.`)
    return
  } catch (error) {
    if (!isCode(error, 404)) throw error
  }

  await apiRequest(config, 'POST', '/tablesdb', {
    databaseId: DATABASE_ID,
    enabled: true,
    name: 'Bikes',
  })

  console.log(`Created database ${DATABASE_ID}.`)
}

async function ensureTable(config) {
  try {
    await apiRequest(config, 'GET', tablePath())
    console.log(`Table ${DATABASE_ID}/${TABLE_ID} already exists.`)
    await apiRequest(config, 'PUT', tablePath(), {
      enabled: true,
      name: 'Motos',
      permissions: TABLE_PERMISSIONS,
      rowSecurity: false,
    })
    console.log('Updated table permissions for admin label.')
    return
  } catch (error) {
    if (!isCode(error, 404)) throw error
  }

  await apiRequest(config, 'POST', `/tablesdb/${encodeURIComponent(DATABASE_ID)}/tables`, {
    enabled: true,
    name: 'Motos',
    permissions: TABLE_PERMISSIONS,
    rowSecurity: false,
    tableId: TABLE_ID,
  })

  console.log(`Created table ${DATABASE_ID}/${TABLE_ID}.`)
}

async function ensureColumn(config, column) {
  try {
    await apiRequest(config, 'GET', tablePath(`/columns/${encodeURIComponent(column.key)}`))
    return
  } catch (error) {
    if (!isCode(error, 404)) throw error
  }

  if (column.type === 'varchar') {
    await apiRequest(config, 'POST', tablePath('/columns/varchar'), {
      key: column.key,
      required: column.required,
      size: column.size,
    })
  } else if (column.type === 'text') {
    await apiRequest(config, 'POST', tablePath('/columns/text'), {
      key: column.key,
      required: column.required,
    })
  } else if (column.type === 'float') {
    await apiRequest(config, 'POST', tablePath('/columns/float'), {
      key: column.key,
      max: column.max,
      min: column.min,
      required: column.required,
    })
  }

  console.log(`Created column ${column.key}.`)
}

async function waitForColumns(config, columns) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const states = await Promise.all(
      columns.map(async ({ key }) => {
        try {
          const column = await apiRequest(
            config,
            'GET',
            tablePath(`/columns/${encodeURIComponent(key)}`),
          )
          return column.status
        } catch {
          return 'missing'
        }
      }),
    )

    if (states.every((status) => status === 'available')) return
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 1000))
  }

  throw new Error('Columns were not available after 30 seconds.')
}

function parseGoogleJson(payload) {
  const jsonStart = payload.indexOf('{')
  const jsonEnd = payload.lastIndexOf('}')
  return JSON.parse(payload.slice(jsonStart, jsonEnd + 1))
}

function cellNumber(cell) {
  return typeof cell?.v === 'number' && Number.isFinite(cell.v) ? cell.v : null
}

function textValue(cell) {
  const value = cell?.f ?? cell?.v
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text && text !== '-' ? text : null
}

function splitBrand(label) {
  const brand = brandPrefixes.find((prefix) => label.startsWith(`${prefix} `))
  if (!brand) return { marca: null, modelo: label }

  return {
    marca: brand,
    modelo: label.slice(brand.length).trim(),
  }
}

function stableRowId(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
}

function ratio(numerator, denominator) {
  return numerator !== null && denominator !== null && denominator > 0
    ? numerator / denominator
    : null
}

async function fetchSeedRows() {
  const response = await fetch(SHEET_URL)
  if (!response.ok) {
    throw new Error(`Could not fetch Google Sheet seed: ${response.status}`)
  }

  const payload = parseGoogleJson(await response.text())
  const table = payload.table
  const models = table.cols
    .map((column, index) => ({ index, label: column.label?.trim() }))
    .filter(({ index, label }) => index > 0 && label)

  return models.map(({ index, label }) => {
    const data = {
      ...splitBrand(label),
      concessionaria: extraInfoByColumn[index]?.concessionaria ?? null,
      garantia: extraInfoByColumn[index]?.garantia ?? null,
      preco_revisoes: extraInfoByColumn[index]?.preco_revisoes ?? null,
      seguro: extraInfoByColumn[index]?.seguro ?? null,
      image_src: imageByColumn[index] ? `/sheet-images/${imageByColumn[index]}` : null,
    }

    for (const row of table.rows) {
      const rowLabel = String(row.c?.[0]?.v ?? '').trim()
      const key = rowMap[rowLabel]
      if (key) data[key] = cellNumber(row.c?.[index])

      if (rowLabel === 'Concessionaria' || rowLabel === 'Concessionária') {
        data.concessionaria = textValue(row.c?.[index]) ?? data.concessionaria
      }
      if (rowLabel === 'Garantia') {
        data.garantia = textValue(row.c?.[index]) ?? data.garantia
      }
      if (
        rowLabel === 'Preco total das revisoes' ||
        rowLabel === 'Preço total das revisões'
      ) {
        data.preco_revisoes = textValue(row.c?.[index]) ?? data.preco_revisoes
      }
      if (rowLabel === 'Seguro (media)' || rowLabel === 'Seguro (média)') {
        data.seguro = textValue(row.c?.[index]) ?? data.seguro
      }
    }

    data.peso_potencia = data.peso_potencia ?? ratio(data.peso, data.potencia)
    data.preco_potencia = data.preco_potencia ?? ratio(data.preco, data.potencia)

    return {
      rowId: stableRowId(`${data.marca ?? ''}-${data.modelo}`) || uniqueId(),
      data,
    }
  })
}

function uniqueId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function seedRows(config) {
  const rows = await fetchSeedRows()

  for (const row of rows) {
    await apiRequest(
      config,
      'PUT',
      tablePath(`/rows/${encodeURIComponent(row.rowId)}`),
      { data: row.data },
    )
  }

  console.log(`Upserted ${rows.length} bike rows.`)
}

async function ensureIndex(config) {
  try {
    await apiRequest(config, 'POST', tablePath('/indexes'), {
      columns: ['marca', 'modelo'],
      key: 'marca_modelo_idx',
      type: 'key',
    })
    console.log('Created index marca_modelo_idx.')
  } catch (error) {
    if (!isCode(error, 409)) throw error
  }
}

async function main() {
  loadEnv()

  const config = appwriteConfigFromEnv()
  const columns = [
    { key: 'marca', type: 'varchar', size: 80, required: false },
    { key: 'modelo', type: 'varchar', size: 160, required: true },
    { key: 'cilindrada', type: 'float', required: false, min: 0 },
    { key: 'potencia', type: 'float', required: false, min: 0 },
    { key: 'consumo', type: 'float', required: false, min: 0 },
    { key: 'peso', type: 'float', required: false, min: 0 },
    { key: 'altura_assento', type: 'float', required: false, min: 0 },
    { key: 'preco', type: 'float', required: false, min: 0 },
    { key: 'peso_potencia', type: 'float', required: false, min: 0 },
    { key: 'preco_potencia', type: 'float', required: false, min: 0 },
    { key: 'concessionaria', type: 'text', required: false },
    { key: 'garantia', type: 'varchar', size: 80, required: false },
    { key: 'preco_revisoes', type: 'varchar', size: 80, required: false },
    { key: 'seguro', type: 'varchar', size: 120, required: false },
    { key: 'image_src', type: 'varchar', size: 120, required: false },
  ]

  await ensureDatabase(config)
  await ensureTable(config)
  for (const column of columns) {
    await ensureColumn(config, column)
  }
  await waitForColumns(config, columns)
  await ensureIndex(config)
  await seedRows(config)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
