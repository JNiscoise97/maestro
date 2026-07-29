import { useState } from "react"
import { cn } from "@/lib/utils"
import { rsvpService, type Attendance } from "@/services/rsvp.service"

const SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif"

const OPTIONS: { value: Attendance; label: string }[] = [
  { value: "yes",          label: "Oui, je serai là" },
  { value: "probably",     label: "Probablement, à confirmer" },
  { value: "probably-not", label: "Probablement pas" },
  { value: "no",           label: "Non, je ne pourrai pas être là" },
]

export function RsvpPage() {
  const [name, setName]             = useState("")
  const [attendance, setAttendance] = useState<Attendance | "">("")
  const [adults, setAdults]         = useState(1)
  const [children, setChildren]     = useState(0)
  const [message, setMessage]       = useState("")
  const [submitted, setSubmitted]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const withCount = attendance === "yes" || attendance === "probably"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !attendance) return
    setLoading(true)
    setError(null)
    try {
      await rsvpService.create({
        wave: "annonce",
        name: name.trim(),
        attendance,
        adults:   withCount ? adults   : null,
        children: withCount ? children : null,
        message:  message.trim() || null,
      })
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setError("Une erreur s'est produite. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F3EC] dark:bg-[#131714] text-[#1A1D1B] dark:text-[#E8E4DA] flex justify-center px-6 py-14">
      <div className="w-full max-w-[500px]">

        <header className="text-center mb-10">
          <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#A8853A] mb-5">
            Mariage · 25–29 juin 2027 · Montpellier
          </p>
          <h1
            className="text-[clamp(26px,6vw,36px)] font-normal leading-snug text-[#2D5036] dark:text-[#7BBF8C] mb-4"
            style={{ fontFamily: SERIF }}
          >
            Serez-vous parmi nous&nbsp;?
          </h1>
          <p className="text-sm text-[#4A504B] dark:text-[#8A8E8B] leading-relaxed">
            Il ne s'agit pas encore d'une confirmation définitive —<br />
            simplement d'une première estimation avant le{" "}
            <strong className="text-[#1A1D1B] dark:text-[#E8E4DA] font-semibold">
              30 septembre 2026
            </strong>
            .
          </p>
        </header>

        <div className="flex items-center gap-3.5 my-9">
          <span className="flex-1 h-px bg-[#DDD9D0] dark:bg-[#272D28]" />
          <span className="text-[#A8853A] text-[9px] tracking-[0.3em]">◆</span>
          <span className="flex-1 h-px bg-[#DDD9D0] dark:bg-[#272D28]" />
        </div>

        {submitted ? (
          <div className="text-center py-14">
            <div className="text-4xl mb-6">💚</div>
            <h2 className="text-3xl font-normal text-[#2D5036] dark:text-[#7BBF8C] mb-4" style={{ fontFamily: SERIF }}>
              Merci&nbsp;!
            </h2>
            <p className="text-sm text-[#4A504B] dark:text-[#8A8E8B] leading-loose mb-1">
              Nous avons bien reçu votre réponse.
            </p>
            <p className="text-sm text-[#4A504B] dark:text-[#8A8E8B] leading-loose">
              Nous avons hâte de vous retrouver à Montpellier.
            </p>
            <p className="text-[19px] italic text-[#1A1D1B] dark:text-[#E8E4DA] mt-7" style={{ fontFamily: SERIF }}>
              Sarah &amp; Jordan
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>

            <div className="mb-9">
              <label htmlFor="name" className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                Prénom &amp; nom
              </label>
              <input
                id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Marie Dupont" autoComplete="name" required
                className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors placeholder:text-[#C5C1B7] dark:placeholder:text-[#363C38]"
              />
            </div>

            <div className="mb-9">
              <span className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                Pensez-vous pouvoir être présent(e)&nbsp;?
              </span>
              <div className="flex flex-col gap-0.5">
                {OPTIONS.map(opt => (
                  <label key={opt.value} className={cn(
                    "flex items-center gap-3.5 px-4 py-3.5 border cursor-pointer transition-colors",
                    attendance === opt.value
                      ? "border-[#2D5036] dark:border-[#7BBF8C] bg-[#EDE9DF] dark:bg-[#1B211C]"
                      : "border-[#DDD9D0] dark:border-[#272D28] hover:border-[#C5C1B7] dark:hover:border-[#363C38] hover:bg-[#EDE9DF] dark:hover:bg-[#1B211C]"
                  )}>
                    <input type="radio" name="attendance" value={opt.value} checked={attendance === opt.value} onChange={() => setAttendance(opt.value)} className="sr-only" />
                    <span className={cn("w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 relative transition-colors", attendance === opt.value ? "border-[#2D5036] dark:border-[#7BBF8C]" : "border-[#C5C1B7] dark:border-[#363C38]")}>
                      {attendance === opt.value && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2D5036] dark:bg-[#7BBF8C]" />}
                    </span>
                    <span className="text-[15px] text-[#1A1D1B] dark:text-[#E8E4DA]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {withCount && (
              <div className="mb-9">
                <span className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                  Combien de personnes seriez-vous&nbsp;?
                </span>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label htmlFor="adults" className="block text-[10.5px] tracking-[0.12em] uppercase text-[#4A504B] dark:text-[#8A8E8B] mb-2">Adultes</label>
                    <input id="adults" type="number" min={1} max={20} value={adults} onChange={e => setAdults(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="children" className="block text-[10.5px] tracking-[0.12em] uppercase text-[#4A504B] dark:text-[#8A8E8B] mb-2">
                      Enfants <span className="normal-case tracking-normal text-[10px] opacity-55">(optionnel)</span>
                    </label>
                    <input id="children" type="number" min={0} max={20} value={children} onChange={e => setChildren(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors" />
                  </div>
                </div>
              </div>
            )}

            <div className="mb-9">
              <label htmlFor="message" className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                Un message <span className="normal-case tracking-normal text-[10px] opacity-55">(optionnel)</span>
              </label>
              <textarea id="message" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Une question, un mot doux…"
                className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors resize-y placeholder:text-[#C5C1B7] dark:placeholder:text-[#363C38]" />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

            <button type="submit" disabled={loading || !name.trim() || !attendance}
              className="w-full py-4 bg-[#2D5036] hover:bg-[#3D6B4A] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11.5px] tracking-[0.2em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A8853A] focus-visible:outline-offset-3">
              {loading ? "Envoi…" : "Envoyer ma réponse"}
            </button>

          </form>
        )}
      </div>
    </div>
  )
}
