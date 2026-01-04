/**
 * Education - Financial education content and tips for users.
 * Displays financial tips and educational glossary terms with explanations.
 */
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
  HandCoins, DollarSign, ChartNoAxesCombined, CreditCard, PiggyBank, Percent, TrendingUpDown, Landmark, 
  Calculator, WalletCards, Handshake, TrendingUp
} from "lucide-react";

// Financial education tip structure
type Tip = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

// Financial glossary term structure
type Term = {
  term: string;
  definition: string;
  details: string[];
  icon: React.ReactNode;
};

export function Education() {
  // Financial tips for personal budget management
  const tips: Tip[] = useMemo(
  () => [
    {
      title: "Zasada 50/30/20",
      description: "Podziel swoje dochody: 50% na potrzeby (czynsz, jedzenie), 30% na przyjemności (rozrywka), 20% na oszczędności i inwestycje.",
      icon: <Calculator size={18} />,
    },
    {
      title: "Fundusz Awaryjny",
      description: "Miej odłożone 3-6 miesięcznych wydatków na nieprzewidziane sytuacje, takie jak awaria samochodu czy pilna wizyta lekarska.",
      icon: <WalletCards size={18} />,
    },
    {
      title: "Unikaj Długów",
      description: "Długi konsumpcyjne (karty kredytowe, pożyczki) szybko rosną przez odsetki. Jeśli musisz pożyczyć, wybieraj najniższe oprocentowanie.",
      icon: <Handshake size={18} />,
    },
    {
      title: "Inwestuj Wcześnie",
      description: "Im wcześniej zaczniesz inwestować, tym więcej możesz zyskać dzięki procentowi składanemu. Nawet małe kwoty mają znaczenie.",
      icon: <TrendingUp size={18} />,
    },
  ],
  []
);

  const terms: Term[] = useMemo(
    () => [
      {
        term: "Podatek",
        icon: <Landmark size={18} />,
        definition:
          "Obowiązkowa opłata pobierana przez państwo od obywateli i firm. W Polsce najważniejsze podatki to:",
        details: [
          "PIT (Podatek Dochodowy od Osób Fizycznych) - podatek od zarobków, rozliczany na podstawie rocznego zeznania podatkowego.",
          "VAT (Podatek od Towarów i Usług) - podatek konsumpcyjny, zwykle 23%.",
          "CIT (Podatek Dochodowy od Osób Prawnych) - podatek od dochodów firm, którego wysokość zależy od rodzaju podatnika (9% lub 19%).",
          "Podatek od nieruchomości - płacony przez właścicieli mieszkań i domów, zależny od lokalizacji i wielkości nieruchomości."
        ],
      },
      {
        term: "Budżet",
        icon: <DollarSign size={18} />,
        definition:
          "Plan finansowy określający przewidywane przychody i wydatki w określonym czasie. Budżet pomaga kontrolować finanse.",
        details: [
          "Budżet osobisty - plan miesięcznych przychodów i wydatków.",
          "Budżet państwa - plan finansowy kraju.",
          "Zasada 50/30/20 - podział dochodów: 50% na potrzeby (czynsz, jedzenie), 30% na przyjemności (rozrywka), 20% na oszczędności i inwestycje."
        ],
      },
      {
        term: "Inwestycja",
        icon: <ChartNoAxesCombined size={18} />,
        definition:
          "Przeznaczenie pieniędzy na zakup aktywów w celu osiągnięcia zysku w przyszłości.",
        details: [
          "Akcje - udziały w firmach, kupowane na giełdzie.",
          "Obligacje - pożyczki dla państwa lub firm.",
          "Nieruchomości - zakup mieszkań lub działek."
        ],
      },
      {
        term: "Kredyt",
        icon: <CreditCard size={18} />,
        definition:
          "Pożyczka pieniędzy od banku lub instytucji finansowej, którą trzeba zwrócić z odsetkami.",
        details: [
          "Kredyt hipoteczny - na zakup mieszkania/domu (długoterminowy).",
          "Kredyt konsumpcyjny - na dowolny cel (krótkoterminowy).",
          "Oprocentowanie - procentowy koszt korzystania z pożyczonych pieniędzy.",
          "RRSO - wskaźnik pokazujący całkowity koszt kredytu w skali roku, uwzględniający nie tylko odsetki, ale także prowizje i inne opłaty.",
          "Rata - miesięczna spłata kredytu."
        ],
      },
      {
        term: "Oszczędności",
        icon: <PiggyBank size={18} />,
        definition:
          "Pieniądze odłożone na przyszłość, niewydane z bieżących dochodów.",
        details: [
          "Fundusz awaryjny - równowartość 3-6 miesięcznych wydatków na nieprzewidziane sytuacje.",
          "Konto oszczędnościowe - bankowy rachunek oszczędnościowy, który umożliwia odkładanie środków i naliczanie odsetek.",
          "Lokata terminowa – zamrożenie pieniędzy na czas trwania umowy w zamian za wyższe oprocentowanie.",
          "Lokaty bankowe – bezpieczne oszczędzanie z łatwym dostępem do pieniędzy i niższym oprocentowaniem."
        ],
      },
      {
        term: "Odsetki",
        icon: <Percent size={18} />,
        definition:
          "Koszt pożyczenia pieniędzy lub dochód z ich oszczędzania.",
        details: [
          "Odsetki od kredytu – kwota należna bankowi za korzystanie z pożyczonych środków.",
          "Odsetki od lokaty – kwota wypłacana przez bank w zamian za powierzenie środków na określony czas.",
          "Stopa procentowa – wartość procentowa określająca wysokość naliczanych odsetek w skali roku.",
          "Kapitalizacja – proces polegający na doliczaniu naliczonych odsetek do kwoty głównej."


        ],
      },
      {
        term: "Inflacja",
        icon: <TrendingUpDown size={18} />,
        definition:
          "Wzrost cen towarów i usług w czasie, co oznacza spadek siły nabywczej pieniądza.",
        details: [
          "Przykład: wzrost inflacji sprawia, że z czasem ta sama kwota pieniędzy ma coraz mniejszą siłę nabywczą.",
          "Stabilna, umiarkowana inflacja jest jednym z głównych celów polityki pieniężnej banku centralnego.",
          "Przy wysokiej inflacji pieniądze trzymane bez oprocentowania tracą na wartości.",
          "Inwestowanie może pomóc zachować realną wartość pieniędzy w dłuższym okresie."

        ],
      },
      {
        term: "Debet",
        icon: <HandCoins size={18} />,
        definition:
          "Krótkoterminowe zadłużenie na rachunku bankowym, pozwalające wydać więcej środków niż wynosi dostępne saldo.",
        details: [
          "Też nazywany \"kredytem w koncie\".",
          "Zazwyczaj ma bardzo wysokie oprocentowanie.",
          "Rozwiązanie to przeznaczone jest głównie na krótkotrwałe, nagłe potrzeby finansowe.",
          "Lepszą alternatywą dla debetu jest posiadanie funduszu awaryjnego."
        ],
      },
    ],
    []
  );

  const [openAll, setOpenAll] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-black">
          Edukacja Finansowa
        </h2>
        <p className="text-slate-500">Podstawowe pojęcia finansowe i praktyczne porady</p>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((t) => (
          <div
            key={t.title}
            className="bg-white rounded-2xl shadow-sm p-4 border"
            style={{ borderColor: "#ac85e0" }}
          >
            <p className="font-semibold mb-1 flex items-center gap-2" style={{ color: "#ac85e0" }}>
              <span 
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ backgroundColor: "rgba(172,133,224,0.12)" }}>
                {t.icon}
              </span>
              {t.title}
            </p>
            <p className="text-slate-600 text-sm">{t.description}</p>
          </div>
        ))}
      </div>

      {/* Dictionary */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-semibold text-black">
              Słownik Pojęć Finansowych
            </p>
            <p className="text-slate-500 text-sm">
              Kliknij na termin, aby dowiedzieć się więcej
            </p>
          </div>

          <Button 
            onClick={() => setOpenAll((v) => !v)}
            style={{ backgroundColor: "#d0b7f1", color: "#000000" }}
          >
            {openAll ? "Zwiń wszystko" : "Rozwiń wszystko"}
          </Button>
        </div>

        <div className="space-y-2">
          {terms.map((item) => (
            <details
              key={item.term}
              open={openAll}
              className="rounded-xl border border-slate-200/50 px-3 py-2 pr-4"
            >
              <summary className="cursor-pointer select-none font-semibold flex items-center gap-3">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: "rgba(172,133,224,0.12)", color: "#ac85e0" }}
                >
                  {item.icon}
                </span>
                {item.term}
              </summary>

              <div className="pt-3 space-y-3">
                <p className="text-slate-700 text-sm mt-2">{item.definition}</p>
                <ul className="space-y-2" style={{ marginLeft: "2cm" }}>
                  {item.details.map((d) => (
                    <li key={d} className="text-sm text-slate-600 list-disc">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Extra info blocks */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-4 space-y-4"
      >
        <p className="font-semibold text-black">
          Przydatne Informacje
        </p>

        <div
          className="pl-4 py-2 rounded-r-lg bg-white"
          style={{ borderLeft: "4px solid #ac85e0" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0" }}>
            Minimalna Płaca w Polsce (2026)
          </p>
          <p className="text-slate-600 text-sm mt-1">
            Minimalne wynagrodzenie w Polsce wynosi 4806 zł brutto (około 3605 zł netto) miesięcznie.
          </p>
        </div>

        <div
          className="pl-4 py-2 rounded-r-lg bg-white"
          style={{ borderLeft: "4px solid #ac85e0" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0" }}>
            Kwota wolna od podatku
          </p>
          <p className="text-slate-600 text-sm mt-1">
            Kwota wolna od podatku to 30 000 zł rocznie - dochód do tej wysokości nie podlega opodatkowaniu PIT.
          </p>
        </div>

        <div
          className="pl-4 py-2 rounded-r-lg bg-white"
          style={{ borderLeft: "4px solid #ac85e0" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0" }}>
            Skala podatkowa PIT (2026)
          </p>
          <p className="text-slate-600 text-sm mt-1">
            Dochody do 120 000 zł rocznie są opodatkowane stawką 12%, a nadwyżka ponad tę kwotę – stawką 32%.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Education;
