import {
  Bike,
  Check,
  Edit3,
  Gauge,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  SlidersHorizontal,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createMoto,
  getCurrentUser,
  isAdmin,
  loadMotos,
  loginAdmin,
  logoutAdmin,
  updateMoto,
  type AdminUser,
  type BikeInput,
  type Moto,
} from './lib/appwrite'

type SortKey = 'score' | 'price' | 'power' | 'weightPower' | 'seat'
type FormMode = 'create' | 'edit'

type MotoFormState = {
  marca: string
  modelo: string
  cilindrada: string
  potencia: string
  consumo: string
  peso: string
  altura_assento: string
  preco: string
  concessionaria: string
  garantia: string
  preco_revisoes: string
  seguro: string
  image_src: string
}

const emptyForm: MotoFormState = {
  marca: '',
  modelo: '',
  cilindrada: '',
  potencia: '',
  consumo: '',
  peso: '',
  altura_assento: '',
  preco: '',
  concessionaria: '',
  garantia: '',
  preco_revisoes: '',
  seguro: '',
  image_src: '',
}

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
})

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  maximumFractionDigits: 0,
  style: 'currency',
})

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

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function brandMapsUrl(moto: Moto) {
  const brand = moto.brand ?? moto.model.split(' ')[0]
  return mapsUrl(`concessionaria ${brand} motos Brasil`)
}

function inRange(value: number | null, min: number, max: number) {
  return value === null || (value >= min && value <= max)
}

function parseNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formFromMoto(moto: Moto): MotoFormState {
  return {
    marca: moto.brand ?? '',
    modelo: moto.rawModel,
    cilindrada: moto.cc?.toString() ?? '',
    potencia: moto.power?.toString() ?? '',
    consumo: moto.consumption?.toString() ?? '',
    peso: moto.weight?.toString() ?? '',
    altura_assento: moto.seat?.toString() ?? '',
    preco: moto.price?.toString() ?? '',
    concessionaria: moto.dealer ?? '',
    garantia: moto.warranty ?? '',
    preco_revisoes: moto.serviceCost ?? '',
    seguro: moto.insurance ?? '',
    image_src: moto.imageSrc ?? '',
  }
}

function inputFromForm(form: MotoFormState): BikeInput {
  return {
    marca: form.marca,
    modelo: form.modelo,
    cilindrada: parseNumber(form.cilindrada),
    potencia: parseNumber(form.potencia),
    consumo: parseNumber(form.consumo),
    peso: parseNumber(form.peso),
    altura_assento: parseNumber(form.altura_assento),
    preco: parseNumber(form.preco),
    concessionaria: form.concessionaria,
    garantia: form.garantia,
    preco_revisoes: form.preco_revisoes,
    seguro: form.seguro,
    image_src: form.image_src,
  }
}

function App() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('score')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(45000)
  const [minPower, setMinPower] = useState(0)
  const [maxPower, setMaxPower] = useState(70)
  const [minSeat, setMinSeat] = useState(0)
  const [maxSeat, setMaxSeat] = useState(900)
  const [minConsumption, setMinConsumption] = useState(0)
  const [maxConsumption, setMaxConsumption] = useState(45)
  const [onlyWithConsumption, setOnlyWithConsumption] = useState(false)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MotoFormState>(emptyForm)
  const [saveStatus, setSaveStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const admin = isAdmin(user)

  const refreshMotos = async (showLoading = true) => {
    if (showLoading) {
      setStatus('loading')
    }
    try {
      setMotos(await loadMotos())
      setStatus('ready')
      setLoadError('')
    } catch (error) {
      setStatus('error')
      setLoadError(error instanceof Error ? error.message : 'Erro desconhecido')
    }
  }

  useEffect(() => {
    loadMotos()
      .then((loadedMotos) => {
        setMotos(loadedMotos)
        setStatus('ready')
        setLoadError('')
      })
      .catch((error) => {
        setStatus('error')
        setLoadError(error instanceof Error ? error.message : 'Erro desconhecido')
      })

    getCurrentUser().then(setUser)
  }, [])

  const stats = useMemo(() => {
    const ready = motos.filter((moto) => moto.price && moto.power)
    const bestValue = ready.toSorted((a, b) => scoreMoto(b) - scoreMoto(a))[0]
    const cheapest = ready.toSorted((a, b) => (a.price ?? 0) - (b.price ?? 0))[0]
    const strongest = ready.toSorted((a, b) => (b.power ?? 0) - (a.power ?? 0))[0]
    const lightest = motos
      .filter((moto) => moto.weight)
      .toSorted((a, b) => (a.weight ?? 0) - (b.weight ?? 0))[0]

    return { bestValue, cheapest, strongest, lightest }
  }, [motos])

  const filteredMotos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return motos
      .filter((moto) => {
        const haystack = `${moto.brand ?? ''} ${moto.model}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      .filter((moto) => inRange(moto.price, minPrice, maxPrice))
      .filter((moto) => inRange(moto.power, minPower, maxPower))
      .filter((moto) => inRange(moto.seat, minSeat, maxSeat))
      .filter((moto) => inRange(moto.consumption, minConsumption, maxConsumption))
      .filter((moto) => !onlyWithConsumption || moto.consumption !== null)
      .toSorted((a, b) => {
        const aValue = sortValue(a, sort)
        const bValue = sortValue(b, sort)

        if (sort === 'price' || sort === 'weightPower' || sort === 'seat') {
          return aValue - bValue
        }

        return bValue - aValue
      })
  }, [
    maxConsumption,
    maxPower,
    maxPrice,
    maxSeat,
    minConsumption,
    minPower,
    minPrice,
    minSeat,
    motos,
    onlyWithConsumption,
    query,
    sort,
  ])

  const maxScore = Math.max(...motos.map(scoreMoto), 1)

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setAuthError('')
    setIsAuthBusy(true)
    try {
      const loggedUser = await loginAdmin(email, password)
      setUser(loggedUser)
      setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Falha no login')
    } finally {
      setIsAuthBusy(false)
    }
  }

  async function handleLogout() {
    await logoutAdmin()
    setUser(null)
    setForm(emptyForm)
    setEditingId(null)
    setFormMode('create')
  }

  function startCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setFormMode('create')
    setSaveStatus('')
  }

  function startEdit(moto: Moto) {
    setForm(formFromMoto(moto))
    setEditingId(moto.id)
    setFormMode('edit')
    setSaveStatus('')
    document.getElementById('admin-editor')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!admin) return
    if (!form.modelo.trim()) {
      setSaveStatus('Informe o modelo.')
      return
    }

    setIsSaving(true)
    setSaveStatus('')
    try {
      const input = inputFromForm(form)
      if (formMode === 'edit' && editingId) {
        await updateMoto(editingId, input)
        setSaveStatus('Moto atualizada.')
      } else {
        await createMoto(input)
        setSaveStatus('Moto adicionada.')
        setForm(emptyForm)
      }
      await refreshMotos()
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setIsSaving(false)
    }
  }

  const heroMoto = stats.bestValue ?? filteredMotos[0]
  const filtersAreDefault =
    query === '' &&
    sort === 'score' &&
    minPrice === 0 &&
    maxPrice === 45000 &&
    minPower === 0 &&
    maxPower === 70 &&
    minSeat === 0 &&
    maxSeat === 900 &&
    minConsumption === 0 &&
    maxConsumption === 45 &&
    !onlyWithConsumption

  function resetFilters() {
    setQuery('')
    setSort('score')
    setMinPrice(0)
    setMaxPrice(45000)
    setMinPower(0)
    setMaxPower(70)
    setMinSeat(0)
    setMaxSeat(900)
    setMinConsumption(0)
    setMaxConsumption(45)
    setOnlyWithConsumption(false)
  }

  return (
    <main className="min-h-screen bg-[#11111b] text-[#cdd6f4]">
      <section className="border-b border-[#313244] bg-[#181825]/95 text-[#cdd6f4]">
        <div className="mx-auto grid w-[min(1480px,calc(100%-32px))] gap-8 py-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#89b4fa] text-[#11111b]">
              <Bike className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5c2e7]">
                NexusBikes
              </p>
              <h1 className="text-2xl font-black leading-tight sm:text-3xl">
                Classificação de motos
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-[#45475a] bg-[#1e1e2e] px-3 py-2 text-sm font-bold text-[#bac2de]">
                  <Shield className="size-4" aria-hidden="true" />
                  {admin ? 'Admin' : 'Usuário'}
                </span>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#cba6f7] px-3 text-sm font-black text-[#11111b] hover:bg-[#f5c2e7]"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sair
                </button>
              </>
            ) : (
              <form className="flex flex-wrap items-center gap-2" onSubmit={handleLogin}>
                <input
                  className="h-10 w-52 rounded-2xl border border-[#45475a] bg-[#1e1e2e] px-3 text-sm font-semibold text-[#cdd6f4] outline-none placeholder:text-[#6c7086] focus:border-[#89b4fa]"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email admin"
                />
                <input
                  className="h-10 w-44 rounded-2xl border border-[#45475a] bg-[#1e1e2e] px-3 text-sm font-semibold text-[#cdd6f4] outline-none placeholder:text-[#6c7086] focus:border-[#89b4fa]"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="senha"
                />
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#a6e3a1] px-3 text-sm font-black text-[#11111b] hover:bg-[#94e2d5] disabled:opacity-60"
                  type="submit"
                  disabled={isAuthBusy}
                >
                  <LogIn className="size-4" aria-hidden="true" />
                  Entrar
                </button>
              </form>
            )}
          </div>
          {authError && <p className="text-sm font-bold text-red-300 lg:col-span-2">{authError}</p>}
        </div>
      </section>

      <div className="mx-auto w-[min(1480px,calc(100%-32px))] py-6">
        <section className="grid overflow-hidden rounded-[2rem] border border-[#313244] bg-[#1e1e2e] text-[#cdd6f4] shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-6 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c2e7]">
              ranking vivo
            </p>
            <h2 className="mt-3 max-w-3xl text-5xl font-black leading-[0.95] text-[#f5e0dc] sm:text-7xl">
              compare antes de acelerar
            </h2>
            <p className="mt-5 max-w-2xl text-base font-medium text-[#bac2de]">
              Preço, potência, peso, consumo, seguro e revisões organizados em
              uma lista que favorece custo-benefício sem esconder os detalhes.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-4">
              <Metric label="modelos" value={motos.length || '...'} />
              <Metric label="melhor compra" value={stats.bestValue?.rawModel ?? '...'} />
              <Metric label="mais barata" value={stats.cheapest?.rawModel ?? '...'} />
              <Metric label="mais potente" value={stats.strongest?.rawModel ?? '...'} />
            </div>
          </div>

          <div className="relative grid min-h-[360px] place-items-center overflow-hidden rounded-r-[2rem] bg-[linear-gradient(135deg,#181825,#313244_50%,#45475a)] p-8">
            {heroMoto?.imageSrc ? (
              <img
                className="relative z-0 w-full max-w-none object-contain drop-shadow-2xl"
                src={heroMoto.imageSrc}
                alt={heroMoto.model}
              />
            ) : null}
            <div className="absolute left-5 top-5 z-10 rounded-3xl border border-[#585b70] bg-[#11111b]/75 px-4 py-3 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#a6adc8]">
                líder atual
              </p>
              <p className="mt-1 max-w-64 text-lg font-black">{heroMoto?.model ?? 'Carregando'}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-[#313244] bg-[#181825] shadow-2xl shadow-black/25">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#313244] bg-[#1e1e2e]/80 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#89b4fa] text-[#11111b]">
                <SlidersHorizontal className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5c2e7]">
                  filtros
                </p>
                <h2 className="text-xl font-black text-[#f5e0dc]">
                  {filteredMotos.length} de {motos.length || '...'} motos
                </h2>
              </div>
            </div>

            <button
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#45475a] bg-[#11111b] px-3 text-sm font-black text-[#bac2de] transition hover:border-[#89b4fa] hover:text-[#89b4fa] disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              onClick={resetFilters}
              disabled={filtersAreDefault}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Resetar
            </button>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(320px,1fr)_260px_190px] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-[#a6adc8]">
              Buscar
              <span className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#6c7086]" />
                <input
                  className="h-[52px] w-full rounded-3xl border border-[#45475a] bg-[#11111b] pl-12 pr-4 text-base font-bold text-[#cdd6f4] outline-none placeholder:text-[#6c7086] focus:border-[#89b4fa] focus:ring-4 focus:ring-[#89b4fa]/10"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Royal, Yamaha, Zontes..."
                />
              </span>
            </label>

            <label className="grid gap-2 text-sm font-black text-[#a6adc8]">
              Ordenar
              <select
                className="h-[52px] rounded-3xl border border-[#45475a] bg-[#11111b] px-4 font-bold text-[#cdd6f4] outline-none focus:border-[#89b4fa] focus:ring-4 focus:ring-[#89b4fa]/10"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="score">Melhor equilibrio</option>
                <option value="price">Menor preco</option>
                <option value="power">Maior potencia</option>
                <option value="weightPower">Menor peso/cv</option>
                <option value="seat">Menor assento</option>
              </select>
            </label>

            <label className="flex h-[52px] items-center justify-between gap-3 rounded-3xl border border-[#45475a] bg-[#11111b] px-4 text-sm font-black text-[#bac2de]">
              <span>Com consumo</span>
              <input
                className="size-5 accent-[#89b4fa]"
                type="checkbox"
                checked={onlyWithConsumption}
                onChange={(event) => setOnlyWithConsumption(event.target.checked)}
              />
            </label>
          </div>

          <div className="grid gap-3 border-t border-[#313244] p-4 md:grid-cols-2 xl:grid-cols-4">
            <RangePair
              format={formatMoney}
              label="Preco"
              max={maxPrice}
              maxLimit={70000}
              min={minPrice}
              minLimit={0}
              onMaxChange={setMaxPrice}
              onMinChange={setMinPrice}
              step={500}
            />
            <RangePair
              format={(value) => `${numberFormatter.format(value)} cv`}
              label="Potencia"
              max={maxPower}
              maxLimit={90}
              min={minPower}
              minLimit={0}
              onMaxChange={setMaxPower}
              onMinChange={setMinPower}
              step={1}
            />
            <RangePair
              format={(value) => `${numberFormatter.format(value)} mm`}
              label="Assento"
              max={maxSeat}
              maxLimit={950}
              min={minSeat}
              minLimit={0}
              onMaxChange={setMaxSeat}
              onMinChange={setMinSeat}
              step={5}
            />
            <RangePair
              format={(value) => `${numberFormatter.format(value)} km/L`}
              label="Consumo"
              max={maxConsumption}
              maxLimit={60}
              min={minConsumption}
              minLimit={0}
              onMaxChange={setMaxConsumption}
              onMinChange={setMinConsumption}
              step={1}
            />
          </div>
        </section>

        {status === 'error' ? (
          <section className="mt-4 rounded border border-red-200 bg-red-50 p-5 text-red-900">
            <h2 className="text-lg font-black">Não foi possível carregar a tabela</h2>
            <p className="mt-1 font-semibold">{loadError}</p>
          </section>
        ) : (
          <>
            <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Highlight icon={Trophy} label="Melhor equilíbrio" moto={stats.bestValue} value={formatMoney(stats.bestValue?.price ?? null)} />
              <Highlight icon={Check} label="Mais acessível" moto={stats.cheapest} value={formatMoney(stats.cheapest?.price ?? null)} />
              <Highlight icon={Gauge} label="Mais potente" moto={stats.strongest} value={formatNumber(stats.strongest?.power ?? null, ' cv')} />
              <Highlight icon={SlidersHorizontal} label="Mais leve" moto={stats.lightest} value={formatNumber(stats.lightest?.weight ?? null, ' kg')} />
            </section>

            {admin && (
              <AdminEditor
                form={form}
                formMode={formMode}
                isSaving={isSaving}
                saveStatus={saveStatus}
                setForm={setForm}
                startCreate={startCreate}
                onSave={handleSave}
              />
            )}

            <section className="mt-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f5c2e7]">
                    classificação
                  </p>
                  <h2 className="text-2xl font-black text-[#f5e0dc]">
                    {filteredMotos.length} motos encontradas
                  </h2>
                </div>
                {admin && (
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#89b4fa] px-3 text-sm font-black text-[#11111b] hover:bg-[#b4befe]"
                    type="button"
                    onClick={startCreate}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Nova moto
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(status === 'loading' ? Array.from({ length: 6 }, () => null) : filteredMotos).map(
                  (moto, index) =>
                    moto ? (
                      <MotoCard
                        key={moto.id}
                        moto={moto}
                        rank={index + 1}
                        maxScore={maxScore}
                        canEdit={admin}
                        onEdit={() => startEdit(moto)}
                      />
                    ) : (
                      <div className="min-h-[430px] animate-pulse rounded-[1.75rem] border border-[#313244] bg-[#1e1e2e]" key={index} />
                    ),
                )}
              </div>
            </section>

            <section className="mt-6 rounded-[1.75rem] border border-[#313244] bg-[#1e1e2e] p-4 shadow-xl shadow-black/20">
              <div className="mb-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f5c2e7]">
                  comparativo
                </p>
                <h2 className="text-2xl font-black text-[#f5e0dc]">Tabela completa</h2>
              </div>
              <div className="overflow-x-auto rounded-3xl border border-[#313244]">
                <table className="compare-table w-full min-w-[1220px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#45475a] text-xs font-black uppercase tracking-wide text-[#a6adc8]">
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">Moto</th>
                      <th className="px-3 py-3">Preço</th>
                      <th className="px-3 py-3">cc</th>
                      <th className="px-3 py-3">cv</th>
                      <th className="px-3 py-3">kg</th>
                      <th className="px-3 py-3">km/L</th>
                      <th className="px-3 py-3">Assento</th>
                      <th className="px-3 py-3">Peso/cv</th>
                      <th className="px-3 py-3">Preço/cv</th>
                      <th className="px-3 py-3">Garantia</th>
                      <th className="px-3 py-3">Revisões</th>
                      <th className="px-3 py-3">Seguro</th>
                      <th className="px-3 py-3">Concessionária</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMotos.map((moto, index) => (
                      <tr className="border-b border-[#313244]" key={moto.id}>
                        <td className="px-3 py-3 font-black text-[#f38ba8]">{index + 1}</td>
                        <td className="px-3 py-3 font-black text-[#f5e0dc]">{moto.model}</td>
                        <td className="px-3 py-3 font-bold">{formatMoney(moto.price)}</td>
                        <td className="px-3 py-3">{formatNumber(moto.cc)}</td>
                        <td className="px-3 py-3">{formatNumber(moto.power)}</td>
                        <td className="px-3 py-3">{formatNumber(moto.weight)}</td>
                        <td className="px-3 py-3">{formatNumber(moto.consumption)}</td>
                        <td className="px-3 py-3">{formatNumber(moto.seat, ' mm')}</td>
                        <td className="px-3 py-3">{formatNumber(moto.weightPower)}</td>
                        <td className="px-3 py-3">{formatMoney(moto.pricePower)}</td>
                        <td className="px-3 py-3">{moto.warranty ?? 'Sem dado'}</td>
                        <td className="px-3 py-3">{moto.serviceCost ?? 'Sem dado'}</td>
                        <td className="px-3 py-3">{moto.insurance ?? 'Sem dado'}</td>
                        <td className="px-3 py-3">
                          {moto.brand ? (
                            <a
                              className="font-black text-[#89b4fa] hover:underline"
                              href={brandMapsUrl(moto)}
                              target="_blank"
                            >
                              Buscar lojas
                            </a>
                          ) : (
                            'Sem marca'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-[#45475a] bg-[#11111b]/55 p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-wide text-[#a6adc8]">{label}</p>
      <p className="mt-1 line-clamp-2 text-lg font-black text-[#f5e0dc]">{value}</p>
    </div>
  )
}

function RangePair({
  format,
  label,
  max,
  maxLimit,
  min,
  minLimit,
  onMaxChange,
  onMinChange,
  step,
}: {
  format: (value: number) => string
  label: string
  max: number
  maxLimit: number
  min: number
  minLimit: number
  onMaxChange: (value: number) => void
  onMinChange: (value: number) => void
  step: number
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-[#313244] bg-[#11111b]/80 p-3 shadow-inner shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-black text-[#cdd6f4]">{label}</span>
        <span className="rounded-full bg-[#313244] px-2 py-1 text-right text-[0.68rem] font-black text-[#f5c2e7]">
          {format(min)} - {format(max)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[0.65rem] font-black uppercase tracking-wide text-[#6c7086]">
          Min
          <input
            aria-label={`${label} minimo`}
            className="h-10 rounded-2xl border border-[#45475a] bg-[#181825] px-3 text-sm font-bold text-[#cdd6f4] outline-none focus:border-[#89b4fa] focus:ring-4 focus:ring-[#89b4fa]/10"
            max={max}
            min={minLimit}
            onChange={(event) => onMinChange(Math.min(Number(event.target.value), max))}
            step={step}
            type="number"
            value={min}
          />
        </label>
        <label className="grid gap-1 text-[0.65rem] font-black uppercase tracking-wide text-[#6c7086]">
          Max
          <input
            aria-label={`${label} maximo`}
            className="h-10 rounded-2xl border border-[#45475a] bg-[#181825] px-3 text-sm font-bold text-[#cdd6f4] outline-none focus:border-[#cba6f7] focus:ring-4 focus:ring-[#cba6f7]/10"
            max={maxLimit}
            min={min}
            onChange={(event) => onMaxChange(Math.max(Number(event.target.value), min))}
            step={step}
            type="number"
            value={max}
          />
        </label>
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#313244] bg-[#181825] px-3 py-2">
        <input
          className="h-2 accent-[#89b4fa]"
          max={maxLimit}
          min={minLimit}
          onChange={(event) => onMinChange(Math.min(Number(event.target.value), max))}
          step={step}
          type="range"
          value={min}
        />
        <input
          className="h-2 accent-[#cba6f7]"
          max={maxLimit}
          min={minLimit}
          onChange={(event) => onMaxChange(Math.max(Number(event.target.value), min))}
          step={step}
          type="range"
          value={max}
        />
      </div>
    </div>
  )
}

function Highlight({
  icon: Icon,
  label,
  moto,
  value,
}: {
  icon: typeof Trophy
  label: string
  moto?: Moto
  value: string
}) {
  return (
    <article className="rounded-[1.5rem] border border-[#313244] bg-[#1e1e2e] p-4 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#a6adc8]">{label}</p>
          <h3 className="mt-2 text-lg font-black leading-tight text-[#f5e0dc]">
            {moto?.model ?? 'Carregando'}
          </h3>
          <p className="mt-2 font-black text-[#89b4fa]">{value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#89b4fa] text-[#11111b]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  )
}

function MotoCard({
  moto,
  rank,
  maxScore,
  canEdit,
  onEdit,
}: {
  moto: Moto
  rank: number
  maxScore: number
  canEdit: boolean
  onEdit: () => void
}) {
  const score = scoreMoto(moto)

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-[#313244] bg-[#1e1e2e] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-[#89b4fa]/60 hover:shadow-[#89b4fa]/10">
      <div className="relative grid h-52 place-items-center overflow-hidden rounded-t-[1.75rem] bg-[linear-gradient(145deg,#181825,#313244)]">
        {moto.imageSrc ? (
          <img className="relative z-0 w-full max-w-none object-contain p-1 drop-shadow-2xl transition duration-200 group-hover:scale-105" src={moto.imageSrc} alt={moto.model} loading="lazy" />
        ) : (
          <span className="grid size-16 place-items-center rounded-3xl bg-[#89b4fa] text-xl font-black text-[#11111b]">
            {moto.model.slice(0, 2)}
          </span>
        )}
        <span className="absolute left-3 top-3 z-10 grid size-11 place-items-center rounded-2xl bg-[#f38ba8] text-lg font-black text-[#11111b]">
          {rank}
        </span>
        {canEdit && (
          <button
            className="absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-2 rounded-2xl bg-[#cba6f7] px-3 text-xs font-black text-[#11111b] shadow hover:bg-[#f5c2e7]"
            type="button"
            onClick={onEdit}
          >
            <Edit3 className="size-4" aria-hidden="true" />
            Editar
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black leading-tight text-[#f5e0dc]">{moto.model}</h3>
            <p className="mt-1 text-xl font-black text-[#f38ba8]">{formatMoney(moto.price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-wide text-[#a6adc8]">score</p>
            <p className="text-lg font-black text-[#f5e0dc]">{Math.round(score)}</p>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-[#313244]">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,#f38ba8,#cba6f7,#89b4fa,#94e2d5)]"
            style={{ width: `${Math.max(8, (score / maxScore) * 100)}%` }}
          />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          <Spec label="Potência" value={formatNumber(moto.power, ' cv')} />
          <Spec label="Peso" value={formatNumber(moto.weight, ' kg')} />
          <Spec label="Consumo" value={formatNumber(moto.consumption, ' km/L')} />
          <Spec label="Assento" value={formatNumber(moto.seat, ' mm')} />
          <Spec label="Peso/cv" value={formatNumber(moto.weightPower)} />
          <Spec label="Preço/cv" value={formatMoney(moto.pricePower)} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          {moto.tags.map((tag) => (
            <span className="rounded-full bg-[#313244] px-2 py-1 text-xs font-black text-[#f5c2e7]" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <details className="mt-4 rounded-3xl border border-[#313244] bg-[#181825]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-black text-[#f5e0dc]">
            Custos e concessionária
          </summary>
          <dl className="grid gap-2 px-3 pb-3 text-sm">
            <Detail label="Garantia" value={moto.warranty ?? 'Sem dado'} />
            <Detail label="Revisões" value={moto.serviceCost ?? 'Sem dado'} />
            <Detail label="Seguro" value={moto.insurance ?? 'Sem dado'} />
            <div className="grid grid-cols-[92px_1fr] gap-2 border-t border-[#313244] pt-2">
              <dt className="font-black text-[#a6adc8]">Loja</dt>
              <dd className="font-bold text-[#cdd6f4]">
                {moto.brand ? (
                  <a className="inline-flex items-center gap-1 text-[#89b4fa] hover:underline" href={brandMapsUrl(moto)} target="_blank">
                    <MapPin className="size-3" aria-hidden="true" />
                    Concessionarias no Maps
                  </a>
                ) : (
                  'Sem marca'
                )}
              </dd>
            </div>
          </dl>
        </details>
      </div>
    </article>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#313244] bg-[#11111b] p-2">
      <dt className="text-xs font-black uppercase tracking-wide text-[#a6adc8]">{label}</dt>
      <dd className="mt-1 font-black text-[#cdd6f4]">{value}</dd>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2 border-t border-[#313244] pt-2">
      <dt className="font-black text-[#a6adc8]">{label}</dt>
      <dd className="font-bold text-[#cdd6f4]">{value}</dd>
    </div>
  )
}

function AdminEditor({
  form,
  formMode,
  isSaving,
  saveStatus,
  setForm,
  startCreate,
  onSave,
}: {
  form: MotoFormState
  formMode: FormMode
  isSaving: boolean
  saveStatus: string
  setForm: (form: MotoFormState) => void
  startCreate: () => void
  onSave: (event: FormEvent) => void
}) {
  const setField = (field: keyof MotoFormState, value: string) => {
    setForm({ ...form, [field]: value })
  }

  return (
    <section id="admin-editor" className="mt-5 rounded border border-stone-300 bg-stone-950 p-4 text-white shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-400">
            modo admin
          </p>
          <h2 className="text-2xl font-black">
            {formMode === 'edit' ? 'Editar moto' : 'Adicionar moto'}
          </h2>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded bg-white px-3 text-sm font-black text-stone-950 hover:bg-stone-200"
          type="button"
          onClick={startCreate}
        >
          {formMode === 'edit' ? <X className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {formMode === 'edit' ? 'Cancelar edição' : 'Limpar'}
        </button>
      </div>

      <form className="grid gap-3" onSubmit={onSave}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Marca" value={form.marca} onChange={(value) => setField('marca', value)} placeholder="Yamaha" />
          <Field label="Modelo" value={form.modelo} onChange={(value) => setField('modelo', value)} placeholder="Nmax ABS" required />
          <Field label="Cilindrada" value={form.cilindrada} onChange={(value) => setField('cilindrada', value)} type="number" />
          <Field label="Potência" value={form.potencia} onChange={(value) => setField('potencia', value)} type="number" />
          <Field label="Consumo" value={form.consumo} onChange={(value) => setField('consumo', value)} type="number" />
          <Field label="Peso" value={form.peso} onChange={(value) => setField('peso', value)} type="number" />
          <Field label="Altura assento" value={form.altura_assento} onChange={(value) => setField('altura_assento', value)} type="number" />
          <Field label="Preço" value={form.preco} onChange={(value) => setField('preco', value)} type="number" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Concessionária" value={form.concessionaria} onChange={(value) => setField('concessionaria', value)} />
          <Field label="Imagem" value={form.image_src} onChange={(value) => setField('image_src', value)} placeholder="/sheet-images/image1.png" />
          <Field label="Garantia" value={form.garantia} onChange={(value) => setField('garantia', value)} />
          <Field label="Revisões" value={form.preco_revisoes} onChange={(value) => setField('preco_revisoes', value)} />
          <Field label="Seguro" value={form.seguro} onChange={(value) => setField('seguro', value)} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded bg-amber-400 px-4 text-sm font-black text-stone-950 hover:bg-amber-300 disabled:opacity-60"
            type="submit"
            disabled={isSaving}
          >
            <Save className="size-4" aria-hidden="true" />
            {isSaving ? 'Salvando' : 'Salvar'}
          </button>
          {saveStatus && <p className="text-sm font-bold text-stone-200">{saveStatus}</p>}
        </div>
      </form>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: 'text' | 'number'
}) {
  return (
    <label className="grid gap-1 text-sm font-black text-stone-300">
      {label}
      <input
        className="h-11 rounded border border-white/15 bg-white/10 px-3 font-semibold text-white outline-none placeholder:text-stone-500 focus:border-amber-400"
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}

export default App
