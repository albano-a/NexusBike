import { useEffect, useMemo, useState } from 'react'
import './App.css'

const SHEET_ID = '1-Jh-eCZRQn2U47jQabNRjJ8svRXI2iPrgSGFIE4wmIg'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=0`

type GoogleCell = {
  v?: string | number | null
  f?: string
}

type GoogleTable = {
  cols: Array<{ label: string }>
  rows: Array<{ c?: GoogleCell[] }>
}

type GoogleResponse = {
  status: string
  table: GoogleTable
}

type Moto = {
  id: string
  model: string
  imageSrc: string | null
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

type SortKey = 'score' | 'price' | 'power' | 'weightPower' | 'seat'

const imageByColumn: Record<number, string> = {
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

const fieldMap = {
  'Cilindrada (cc)': 'cc',
  'Potência (cv)': 'power',
  'Consumo (km/L) (média)': 'consumption',
  'Peso (Kg)': 'weight',
  'Altura do assento (mm)': 'seat',
  'Preço (R$)': 'price',
  'Peso/potencia': 'weightPower',
  'Preço/potência': 'pricePower',
} as const

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
})

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  maximumFractionDigits: 0,
  style: 'currency',
})

function googleJsonp(url: string): Promise<GoogleResponse> {
  const callbackName = `motosSheet_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`
  const sheetWindow = window as unknown as Record<string, unknown>

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const separator = url.includes('?') ? '&' : '?'
    script.src = `${url}${separator}tqx=out:json;responseHandler:${callbackName}`
    script.async = true

    const cleanup = () => {
      delete sheetWindow[callbackName]
      script.remove()
    }

    sheetWindow[callbackName] = (payload: GoogleResponse) => {
      cleanup()
      if (payload.status !== 'ok') {
        reject(new Error('Google Sheets returned an invalid response.'))
        return
      }
      resolve(payload)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('Unable to load the public Google Sheet.'))
    }

    document.body.appendChild(script)
  })
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function extractMotos(table: GoogleTable): Moto[] {
  const labels = table.cols.map((column) => column.label.trim())
  const models = labels
    .map((label, index) => ({ index, label }))
    .filter(({ index, label }) => index > 0 && label)

  return models.map(({ index, label }) => {
    const values: Partial<Record<keyof typeof fieldMap, number | null>> = {}

    table.rows.forEach((row) => {
      const rowLabel = String(row.c?.[0]?.v ?? '').trim()
      if (rowLabel in fieldMap) {
        values[rowLabel as keyof typeof fieldMap] = toNumber(row.c?.[index]?.v)
      }
    })

    const tags = [
      label.toLowerCase().includes('lançamento') ? 'Lançamento' : null,
      (values['Cilindrada (cc)'] ?? 0) >= 350 ? 'Média cilindrada' : null,
      (values['Preço (R$)'] ?? 0) <= 25000 ? 'Até R$ 25 mil' : null,
      (values['Peso/potencia'] ?? Infinity) <= 4.5 ? 'Performance' : null,
    ].filter(Boolean) as string[]

    return {
      id: `${index}-${label}`,
      model: label,
      imageSrc: imageByColumn[index]
        ? `/sheet-images/${imageByColumn[index]}`
        : null,
      cc: values['Cilindrada (cc)'] ?? null,
      power: values['Potência (cv)'] ?? null,
      consumption: values['Consumo (km/L) (média)'] ?? null,
      weight: values['Peso (Kg)'] ?? null,
      seat: values['Altura do assento (mm)'] ?? null,
      price: values['Preço (R$)'] ?? null,
      weightPower: values['Peso/potencia'] ?? null,
      pricePower: values['Preço/potência'] ?? null,
      tags,
    }
  })
}

function scoreMoto(moto: Moto) {
  const pricePowerScore = moto.pricePower ? 1200 / moto.pricePower : 0
  const powerWeightScore = moto.weightPower ? 8 / moto.weightPower : 0
  const economyScore = moto.consumption ? moto.consumption / 30 : 0
  const affordabilityScore = moto.price ? 28000 / moto.price : 0

  return (
    pricePowerScore * 34 +
    powerWeightScore * 30 +
    economyScore * 18 +
    affordabilityScore * 18
  )
}

function formatNumber(value: number | null, suffix = '') {
  return value === null ? 'Sem dado' : `${numberFormatter.format(value)}${suffix}`
}

function formatMoney(value: number | null) {
  return value === null ? 'Sem dado' : moneyFormatter.format(value)
}

function sortValue(moto: Moto, sort: SortKey) {
  if (sort === 'score') return scoreMoto(moto)
  return moto[sort] ?? (sort === 'price' || sort === 'weightPower' ? Infinity : -Infinity)
}

function App() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('score')
  const [maxPrice, setMaxPrice] = useState(45000)
  const [onlyWithConsumption, setOnlyWithConsumption] = useState(false)

  useEffect(() => {
    googleJsonp(SHEET_URL)
      .then((payload) => {
        setMotos(extractMotos(payload.table))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const stats = useMemo(() => {
    const ready = motos.filter((moto) => moto.price && moto.power)
    const bestValue = ready.toSorted((a, b) => scoreMoto(b) - scoreMoto(a))[0]
    const cheapest = ready.toSorted((a, b) => (a.price ?? 0) - (b.price ?? 0))[0]
    const strongest = ready.toSorted((a, b) => (b.power ?? 0) - (a.power ?? 0))[0]
    const lightest = motos
      .filter((moto) => moto.weight)
      .toSorted((a, b) => (a.weight ?? 0) - (b.weight ?? 0))[0]

    return { bestValue, cheapest, lightest, strongest }
  }, [motos])

  const filteredMotos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const sorted = motos
      .filter((moto) => moto.model.toLowerCase().includes(normalizedQuery))
      .filter((moto) => !moto.price || moto.price <= maxPrice)
      .filter((moto) => !onlyWithConsumption || moto.consumption !== null)
      .toSorted((a, b) => {
        const aValue = sortValue(a, sort)
        const bValue = sortValue(b, sort)

        if (sort === 'price' || sort === 'weightPower' || sort === 'seat') {
          return aValue - bValue
        }

        return bValue - aValue
      })

    return sorted
  }, [maxPrice, motos, onlyWithConsumption, query, sort])

  const maxPower = Math.max(...motos.map((moto) => moto.power ?? 0), 1)
  const maxScore = Math.max(...motos.map(scoreMoto), 1)
  const visibleCards: Array<Moto | null> =
    status === 'loading' ? Array.from({ length: 6 }, () => null) : filteredMotos

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Google Sheets live dashboard</p>
          <h1>Motos em comparação</h1>
          <p className="lede">
            Uma visão rápida das motos da primeira aba, com preço, potência,
            peso, consumo e indicadores de custo-benefício.
          </p>
        </div>

        <div className="hero-showcase" aria-label="Moto em destaque">
          <img
            src="/sheet-images/image16.png"
            alt=""
            className="hero-bike"
          />
          <div className="hero-meter">
            <span className="meter-ring">
              {status === 'ready' ? motos.length : '...'}
            </span>
            <span>modelos carregados</span>
          </div>
        </div>
      </section>

      {status === 'error' ? (
        <section className="state-panel">
          <h2>Não foi possível carregar a planilha</h2>
          <p>Confira se o link público continua liberado para leitura.</p>
        </section>
      ) : (
        <>
          <section className="toolbar" aria-label="Filtros do dashboard">
            <label className="search-control">
              <span>Buscar modelo</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Royal, Yamaha, Zontes..."
              />
            </label>

            <label className="select-control">
              <span>Ordenar por</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="score">Melhor equilíbrio</option>
                <option value="price">Menor preço</option>
                <option value="power">Maior potência</option>
                <option value="weightPower">Menor peso/cv</option>
                <option value="seat">Menor assento</option>
              </select>
            </label>

            <label className="range-control">
              <span>Até {formatMoney(maxPrice)}</span>
              <input
                type="range"
                min="16000"
                max="45000"
                step="500"
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
            </label>

            <label className="toggle-control">
              <input
                type="checkbox"
                checked={onlyWithConsumption}
                onChange={(event) =>
                  setOnlyWithConsumption(event.target.checked)
                }
              />
              <span>Somente com consumo</span>
            </label>
          </section>

          <section className="stats-grid" aria-label="Destaques">
            <article>
              <span>Melhor equilíbrio</span>
              <strong>{stats.bestValue?.model ?? 'Carregando'}</strong>
              <small>{formatMoney(stats.bestValue?.price ?? null)}</small>
            </article>
            <article>
              <span>Mais acessível</span>
              <strong>{stats.cheapest?.model ?? 'Carregando'}</strong>
              <small>{formatMoney(stats.cheapest?.price ?? null)}</small>
            </article>
            <article>
              <span>Mais potente</span>
              <strong>{stats.strongest?.model ?? 'Carregando'}</strong>
              <small>{formatNumber(stats.strongest?.power ?? null, ' cv')}</small>
            </article>
            <article>
              <span>Mais leve</span>
              <strong>{stats.lightest?.model ?? 'Carregando'}</strong>
              <small>{formatNumber(stats.lightest?.weight ?? null, ' kg')}</small>
            </article>
          </section>

          <section className="content-grid">
            <div className="cards-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Ranking</p>
                  <h2>{filteredMotos.length} motos encontradas</h2>
                </div>
              </div>

              <div className="moto-grid">
                {visibleCards.map((item, index) => {
                    if (!item) {
                      return <article className="moto-card loading" key={index} />
                    }

                    const score = scoreMoto(item)

                    return (
                      <article className="moto-card" key={item.id}>
                        <div className="moto-photo">
                          {item.imageSrc ? (
                            <img src={item.imageSrc} alt={item.model} loading="lazy" />
                          ) : (
                            <span>{item.model.slice(0, 2)}</span>
                          )}
                        </div>

                        <div className="card-head">
                          <span className="rank">{index + 1}</span>
                          <div>
                            <h3>{item.model}</h3>
                            <p>{formatMoney(item.price)}</p>
                          </div>
                        </div>

                        <div className="score-bar">
                          <span style={{ width: `${(score / maxScore) * 100}%` }} />
                        </div>

                        <dl className="spec-list">
                          <div>
                            <dt>Potência</dt>
                            <dd>{formatNumber(item.power, ' cv')}</dd>
                          </div>
                          <div>
                            <dt>Peso</dt>
                            <dd>{formatNumber(item.weight, ' kg')}</dd>
                          </div>
                          <div>
                            <dt>Consumo</dt>
                            <dd>{formatNumber(item.consumption, ' km/L')}</dd>
                          </div>
                          <div>
                            <dt>Assento</dt>
                            <dd>{formatNumber(item.seat, ' mm')}</dd>
                          </div>
                        </dl>

                        {item.tags.length > 0 && (
                          <div className="tag-row">
                            {item.tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </article>
                    )
                  },
                )}
              </div>
            </div>

            <aside className="chart-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Potência</p>
                  <h2>cv por modelo</h2>
                </div>
              </div>

              <div className="bar-chart">
                {filteredMotos.slice(0, 10).map((moto) => (
                  <div className="bar-row" key={moto.id}>
                    <span>{moto.model}</span>
                    <div>
                      <i style={{ width: `${((moto.power ?? 0) / maxPower) * 100}%` }} />
                    </div>
                    <strong>{formatNumber(moto.power, '')}</strong>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <section className="table-panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">Tabela</p>
                <h2>Comparação completa</h2>
              </div>
              <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank">
                Abrir planilha
              </a>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Preço</th>
                    <th>cc</th>
                    <th>cv</th>
                    <th>kg</th>
                    <th>km/L</th>
                    <th>Assento</th>
                    <th>Preço/cv</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMotos.map((moto) => (
                    <tr key={moto.id}>
                      <td>{moto.model}</td>
                      <td>{formatMoney(moto.price)}</td>
                      <td>{formatNumber(moto.cc)}</td>
                      <td>{formatNumber(moto.power)}</td>
                      <td>{formatNumber(moto.weight)}</td>
                      <td>{formatNumber(moto.consumption)}</td>
                      <td>{formatNumber(moto.seat, ' mm')}</td>
                      <td>{formatMoney(moto.pricePower)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default App
