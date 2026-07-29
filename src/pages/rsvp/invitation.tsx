import { useState } from "react"
import { cn } from "@/lib/utils"
import { rsvpService } from "@/services/rsvp.service"

const SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif"

const DAYS = [
  { value: "2027-06-25", label: "Jeudi 25 juin" },
  { value: "2027-06-26", label: "Vendredi 26 juin" },
  { value: "2027-06-27", label: "Samedi 27 juin" },
  { value: "2027-06-28", label: "Dimanche 28 juin" },
  { value: "2027-06-29", label: "Lundi 29 juin" },
]

export function RsvpInvitationPage() {
  const [name, setName]                     = useState("")
  const [attending, setAttending]           = useState<"yes" | "no" | "">("")
  const [adults, setAdults]                 = useState(1)
  const [children, setChildren]             = useState(0)
  const [days, setDays]                     = useState<string[]>([])
  const [city, setCity]                     = useState("")
  const [needsAccommodation, setNeeds]      = useState<boolean | null>(null)
  const [dietary, setDietary]               = useState("")
  const [message, setMessage]               = useState("")
  const [submitted, setSubmitted]           = useState(false)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const isYes = attending === "yes"

  function toggleDay(value: string) {
    setDays(prev => prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !attending) return
    setLoading(true)
    setError(null)
    try {
      await rsvpService.create({
        wave: "invitation",
        name: name.trim(),
        attendance: attending,
        adults:              isYes ? adults : null,
        children:            isYes ? children : null,
        daysAttending:       isYes && days.length > 0 ? days : null,
        cityOfOrigin:        isYes && city.trim() ? city.trim() : null,
        needsAccommodation:  isYes ? needsAccommodation : null,
        dietaryConstraints:  isYes && dietary.trim() ? dietary.trim() : null,
        message:             message.trim() || null,
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
            Confirmez votre présence
          </h1>
          <p className="text-sm text-[#4A504B] dark:text-[#8A8E8B] leading-relaxed">
            Merci de nous confirmer votre réponse définitive avant le{" "}
            <strong className="text-[#1A1D1B] dark:text-[#E8E4DA] font-semibold">
              31 mars 2027
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
              {attending === "yes" ? "À très bientôt !" : "Merci de nous avoir répondu."}
            </h2>
            <p className="text-sm text-[#4A504B] dark:text-[#8A8E8B] leading-loose">
              {attending === "yes"
                ? "Nous avons bien reçu votre confirmation. Nous avons hâte de vous retrouver à Montpellier."
                : "Nous sommes sincèrement touchés que vous ayez pris le temps de nous répondre."}
            </p>
            <p className="text-[19px] italic text-[#1A1D1B] dark:text-[#E8E4DA] mt-7" style={{ fontFamily: SERIF }}>
              Sarah &amp; Jordan
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>

            {/* Nom */}
            <div className="mb-9">
              <label htmlFor="name" className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                Prénom &amp; nom
              </label>
              <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Marie Dupont" autoComplete="name" required
                className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors placeholder:text-[#C5C1B7] dark:placeholder:text-[#363C38]" />
            </div>

            {/* Présence */}
            <div className="mb-9">
              <span className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                Confirmez-vous votre présence&nbsp;?
              </span>
              <div className="flex flex-col gap-0.5">
                {([
                  { value: "yes", label: "Oui, je serai là avec joie" },
                  { value: "no",  label: "Non, je ne pourrai malheureusement pas être là" },
                ] as const).map(opt => (
                  <label key={opt.value} className={cn(
                    "flex items-center gap-3.5 px-4 py-3.5 border cursor-pointer transition-colors",
                    attending === opt.value
                      ? "border-[#2D5036] dark:border-[#7BBF8C] bg-[#EDE9DF] dark:bg-[#1B211C]"
                      : "border-[#DDD9D0] dark:border-[#272D28] hover:border-[#C5C1B7] dark:hover:border-[#363C38] hover:bg-[#EDE9DF] dark:hover:bg-[#1B211C]"
                  )}>
                    <input type="radio" name="attending" value={opt.value} checked={attending === opt.value} onChange={() => setAttending(opt.value)} className="sr-only" />
                    <span className={cn("w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 relative transition-colors", attending === opt.value ? "border-[#2D5036] dark:border-[#7BBF8C]" : "border-[#C5C1B7] dark:border-[#363C38]")}>
                      {attending === opt.value && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2D5036] dark:bg-[#7BBF8C]" />}
                    </span>
                    <span className="text-[15px] text-[#1A1D1B] dark:text-[#E8E4DA]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {isYes && <>

              {/* Nombre */}
              <div className="mb-9">
                <span className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                  Combien de personnes&nbsp;?
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

              {/* Jours */}
              <div className="mb-9">
                <span className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                  Quels jours serez-vous présent(e)&nbsp;?
                </span>
                <div className="flex flex-col gap-0.5">
                  {DAYS.map(day => (
                    <label key={day.value} className={cn(
                      "flex items-center gap-3.5 px-4 py-3 border cursor-pointer transition-colors",
                      days.includes(day.value)
                        ? "border-[#2D5036] dark:border-[#7BBF8C] bg-[#EDE9DF] dark:bg-[#1B211C]"
                        : "border-[#DDD9D0] dark:border-[#272D28] hover:border-[#C5C1B7] dark:hover:border-[#363C38] hover:bg-[#EDE9DF] dark:hover:bg-[#1B211C]"
                    )}>
                      <input type="checkbox" checked={days.includes(day.value)} onChange={() => toggleDay(day.value)} className="sr-only" />
                      <span className={cn(
                        "w-4 h-4 border-[1.5px] flex-shrink-0 relative transition-colors",
                        days.includes(day.value) ? "border-[#2D5036] dark:border-[#7BBF8C] bg-[#2D5036] dark:bg-[#7BBF8C]" : "border-[#C5C1B7] dark:border-[#363C38]"
                      )}>
                        {days.includes(day.value) && (
                          <svg viewBox="0 0 10 8" className="absolute inset-0 w-full h-full p-0.5" fill="none">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[15px] text-[#1A1D1B] dark:text-[#E8E4DA]">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ville */}
              <div className="mb-9">
                <label htmlFor="city" className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                  Ville de départ <span className="normal-case tracking-normal text-[10px] opacity-55">(pour organiser le transport)</span>
                </label>
                <input id="city" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris, Abidjan, Dakar…"
                  className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors placeholder:text-[#C5C1B7] dark:placeholder:text-[#363C38]" />
              </div>

              {/* Hébergement */}
              <div className="mb-9">
                <span className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                  Avez-vous besoin d'hébergement&nbsp;?
                </span>
                <div className="flex flex-col gap-0.5">
                  {([
                    { value: true,  label: "Oui, je cherche un hébergement" },
                    { value: false, label: "Non, j'ai déjà une solution" },
                  ] as const).map(opt => (
                    <label key={String(opt.value)} className={cn(
                      "flex items-center gap-3.5 px-4 py-3.5 border cursor-pointer transition-colors",
                      needsAccommodation === opt.value
                        ? "border-[#2D5036] dark:border-[#7BBF8C] bg-[#EDE9DF] dark:bg-[#1B211C]"
                        : "border-[#DDD9D0] dark:border-[#272D28] hover:border-[#C5C1B7] dark:hover:border-[#363C38] hover:bg-[#EDE9DF] dark:hover:bg-[#1B211C]"
                    )}>
                      <input type="radio" name="accommodation" checked={needsAccommodation === opt.value} onChange={() => setNeeds(opt.value)} className="sr-only" />
                      <span className={cn("w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 relative transition-colors", needsAccommodation === opt.value ? "border-[#2D5036] dark:border-[#7BBF8C]" : "border-[#C5C1B7] dark:border-[#363C38]")}>
                        {needsAccommodation === opt.value && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2D5036] dark:bg-[#7BBF8C]" />}
                      </span>
                      <span className="text-[15px] text-[#1A1D1B] dark:text-[#E8E4DA]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Régimes */}
              <div className="mb-9">
                <label htmlFor="dietary" className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                  Allergies &amp; régimes alimentaires <span className="normal-case tracking-normal text-[10px] opacity-55">(optionnel)</span>
                </label>
                <textarea id="dietary" rows={2} value={dietary} onChange={e => setDietary(e.target.value)}
                  placeholder="Végétarien, sans gluten, allergie aux fruits à coque…"
                  className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors resize-y placeholder:text-[#C5C1B7] dark:placeholder:text-[#363C38]" />
              </div>

            </>}

            {/* Message */}
            <div className="mb-9">
              <label htmlFor="message" className="block text-[10.5px] tracking-[0.16em] uppercase text-[#4A504B] dark:text-[#8A8E8B] font-medium mb-3.5">
                Un message <span className="normal-case tracking-normal text-[10px] opacity-55">(optionnel)</span>
              </label>
              <textarea id="message" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Une question, un mot doux…"
                className="w-full bg-transparent border-0 border-b border-[#C5C1B7] dark:border-[#363C38] rounded-none py-2.5 text-base text-[#1A1D1B] dark:text-[#E8E4DA] focus:border-[#2D5036] dark:focus:border-[#7BBF8C] focus:outline-none transition-colors resize-y placeholder:text-[#C5C1B7] dark:placeholder:text-[#363C38]" />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

            <button type="submit" disabled={loading || !name.trim() || !attending}
              className="w-full py-4 bg-[#2D5036] hover:bg-[#3D6B4A] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11.5px] tracking-[0.2em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A8853A] focus-visible:outline-offset-3">
              {loading ? "Envoi…" : "Confirmer ma réponse"}
            </button>

          </form>
        )}
      </div>
    </div>
  )
}
