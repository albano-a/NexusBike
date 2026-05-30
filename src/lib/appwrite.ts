import { Account, Client, ID, Query, TablesDB, type Models } from 'appwrite'

export const APPWRITE_DATABASE_ID =
  import.meta.env.VITE_APPWRITE_DATABASE_ID || 'bikes'
export const APPWRITE_TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID || 'motos'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID

const client = new Client()

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId)
}

const account = new Account(client)
const tables = new TablesDB(client)

export type BikeRow = Models.Row & {
  marca?: string | null
  modelo?: string | null
  cilindrada?: number | null
  potencia?: number | null
  consumo?: number | null
  peso?: number | null
  altura_assento?: number | null
  preco?: number | null
  peso_potencia?: number | null
  preco_potencia?: number | null
  concessionaria?: string | null
  garantia?: string | null
  preco_revisoes?: string | null
  seguro?: string | null
  image_src?: string | null
}

export type BikeInput = {
  marca: string
  modelo: string
  cilindrada: number | null
  potencia: number | null
  consumo: number | null
  peso: number | null
  altura_assento: number | null
  preco: number | null
  concessionaria: string
  garantia: string
  preco_revisoes: string
  seguro: string
  image_src: string
}

export type AdminUser = Models.User<Models.Preferences>

export type Moto = {
  id: string
  brand: string | null
  model: string
  rawModel: string
  imageSrc: string | null
  dealer: string | null
  warranty: string | null
  serviceCost: string | null
  insurance: string | null
  cc: number | null
  power: number | null
  consumption: number | null
  weight: number | null
  seat: number | null
  price: number | null
  weightPower: number | null
  pricePower: number | null
  tags: string[]
}

function ensureConfig() {
  if (!endpoint || !projectId) {
    throw new Error('Appwrite endpoint and project id are required.')
  }
}

function cleanText(value: string) {
  const text = value.trim()
  return text ? text : null
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function ratio(numerator: number | null, denominator: number | null) {
  return numerator !== null && denominator !== null && denominator > 0
    ? numerator / denominator
    : null
}

function buildTags(moto: Pick<Moto, 'model' | 'cc' | 'price' | 'weightPower'>) {
  return [
    moto.model.toLowerCase().includes('lancamento') ||
    moto.model.toLowerCase().includes('lançamento')
      ? 'Lançamento'
      : null,
    (moto.cc ?? 0) >= 350 ? 'Média cilindrada' : null,
    (moto.price ?? 0) <= 25000 ? 'Até R$ 25 mil' : null,
    (moto.weightPower ?? Infinity) <= 4.5 ? 'Performance' : null,
  ].filter(Boolean) as string[]
}

function rowToMoto(row: BikeRow): Moto {
  const power = toNumber(row.potencia)
  const weight = toNumber(row.peso)
  const price = toNumber(row.preco)
  const rawModel = row.modelo?.trim() || 'Modelo sem nome'
  const brand = row.marca?.trim() || null
  const weightPower = toNumber(row.peso_potencia) ?? ratio(weight, power)
  const pricePower = toNumber(row.preco_potencia) ?? ratio(price, power)

  const moto: Moto = {
    id: row.$id,
    brand,
    model: brand ? `${brand} ${rawModel}`.trim() : rawModel,
    rawModel,
    imageSrc: row.image_src || null,
    dealer: row.concessionaria || null,
    warranty: row.garantia || null,
    serviceCost: row.preco_revisoes || null,
    insurance: row.seguro || null,
    cc: toNumber(row.cilindrada),
    power,
    consumption: toNumber(row.consumo),
    weight,
    seat: toNumber(row.altura_assento),
    price,
    weightPower,
    pricePower,
    tags: [],
  }

  moto.tags = buildTags(moto)

  return moto
}

function stableRowId(value: string) {
  const id = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)

  return id || ID.unique()
}

function bikeInputToRow(input: BikeInput) {
  const pesoPotencia = ratio(input.peso, input.potencia)
  const precoPotencia = ratio(input.preco, input.potencia)

  return {
    marca: cleanText(input.marca),
    modelo: input.modelo.trim(),
    cilindrada: input.cilindrada,
    potencia: input.potencia,
    consumo: input.consumo,
    peso: input.peso,
    altura_assento: input.altura_assento,
    preco: input.preco,
    peso_potencia: pesoPotencia,
    preco_potencia: precoPotencia,
    concessionaria: cleanText(input.concessionaria),
    garantia: cleanText(input.garantia),
    preco_revisoes: cleanText(input.preco_revisoes),
    seguro: cleanText(input.seguro),
    image_src: cleanText(input.image_src),
  }
}

export function isAdmin(user: AdminUser | null) {
  return user?.labels.includes('admin') ?? false
}

export async function getCurrentUser() {
  ensureConfig()
  try {
    return await account.get()
  } catch {
    return null
  }
}

export async function loginAdmin(email: string, password: string) {
  ensureConfig()
  await account.createEmailPasswordSession({ email, password })
  return account.get()
}

export async function logoutAdmin() {
  ensureConfig()
  await account.deleteSession({ sessionId: 'current' })
}

export async function loadMotos() {
  ensureConfig()

  const response = await tables.listRows<BikeRow>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_TABLE_ID,
    queries: [Query.limit(100), Query.orderAsc('marca'), Query.orderAsc('modelo')],
  })

  return response.rows.map(rowToMoto)
}

export async function createMoto(input: BikeInput) {
  ensureConfig()
  const data = bikeInputToRow(input)
  const row = await tables.createRow<BikeRow>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_TABLE_ID,
    rowId: stableRowId(`${input.marca}-${input.modelo}`),
    data,
  })

  return rowToMoto(row)
}

export async function updateMoto(id: string, input: BikeInput) {
  ensureConfig()
  const row = await tables.updateRow<BikeRow>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_TABLE_ID,
    rowId: id,
    data: bikeInputToRow(input),
  })

  return rowToMoto(row)
}
