/**
 * Education page - financial education content.
 */
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
  HandCoins, DollarSign, ChartNoAxesCombined, CreditCard, PiggyBank, Percent, TrendingUpDown, Landmark, 
  Calculator, WalletCards, Handshake, TrendingUp
} from "lucide-react";

type Term = {
  term: string;
  definition: string;
  details: string[];
  icon: React.ReactNode;
};

type Tip = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

export function Education() {
  const tips: Tip[] = useMemo(
  () => [
    {
      title: "Zasada 50/30/20",
      description: "Podziel swoje dochody: 50% na potrzeby (czynsz, jedzenie), 30% na przyjemności (rozrywka), 20% na oszczędności i inwestycje.",
      icon: <Calculator size={18} />,
    },
    {
      title: "Fundusz Awaryjny",
      description: "Zawsze miej odłożone 3-6 miesięcznych wydatków na nieprzewidziane sytuacje jak utrata pracy czy naprawa samochodu.",
      icon: <WalletCards size={18} />,
    },
    {
      title: "Unikaj Długów",
      description: "Długi konsumpcyjne (karty kredytowe, pożyczki) są drogie. Jeśli już musisz pożyczyć, wybieraj najniższe oprocentowanie.",
      icon: <Handshake size={18} />,
    },
    {
      title: "Inwestuj Wcześnie",
      description: "Im wcześniej zaczniesz inwestować, tym więcej zarobisz dzięki procentowi składanemu. Nawet małe kwoty się liczą!",
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
          "PIT (Podatek Dochodowy od Osób Fizycznych) - podatek od zarobków.",
          "VAT (Podatek od Towarów i Usług) - podatek konsumpcyjny, zwykle 23%.",
          "CIT (Podatek Dochodowy od Osób Prawnych) - podatek dla firm.",
          "Podatek od nieruchomości - płacony przez właścicieli mieszkań i domów."
        ],
      },
      {
        term: "Budżet",
        icon: <DollarSign size={18} />,
        definition:
          "Plan finansowy określający przewidywane przychody i wydatki w określonym czasie. Budżet pomaga kontrolować finanse.",
        details: [
          "Budżet osobisty - plan twoich miesięcznych przychodów i wydatków.",
          "Budżet państwa - plan finansowy kraju.",
          "Zasada 50/30/20: 50% na potrzeby, 30% na przyjemności, 20% na oszczędności."
        ],
      },
      {
        term: "Inwestycja",
        icon: <ChartNoAxesCombined size={18} />,
        definition:
          "Przeznaczenie pieniędzy na zakup aktywów, które mogą przynieść zysk w przyszłości.",
        details: [
          "Akcje - udziały w firmach, kupowane na giełdzie.",
          "Obligacje - pożyczki dla państwa lub firm.",
          "Nieruchomości - zakup mieszkań lub działek.",
          "Fundusze inwestycyjne - profesjonalnie zarządzane portfele.",
          "Lokaty bankowe - bezpieczne oszczędności z niskim zyskiem."
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
          "Oprocentowanie - koszt pożyczenia pieniędzy.",
          "RRSO - rzeczywista roczna stopa oprocentowania (prawdziwy koszt kredytu).",
          "Rata - miesięczna spłata kredytu."
        ],
      },
      {
        term: "Oszczędności",
        icon: <PiggyBank size={18} />,
        definition:
          "Pieniądze odłożone na przyszłość, niewydane z bieżących dochodów.",
        details: [
          "Fundusz awaryjny - 3-6 miesięcznych wydatków na nieprzewidziane sytuacje.",
          "Konto oszczędnościowe - specjalne konto z wyższym oprocentowaniem.",
          "Lokata terminowa - zablokowanie pieniędzy na określony czas za wyższy zysk.",
          "Zasada: odłóż minimum 10-20% swoich dochodów."
        ],
      },
      {
        term: "Odsetki",
        icon: <Percent size={18} />,
        definition:
          "Koszt pożyczenia pieniędzy lub nagroda za ich oszczędzanie.",
        details: [
          "Odsetki od kredytu - płacisz bankowi za pożyczenie pieniędzy.",
          "Odsetki od lokaty - bank płaci tobie za przechowanie pieniędzy.",
          "Stopa procentowa - procent naliczany rocznie.",
          "Kapitalizacja - doliczanie odsetek do kwoty głównej."
        ],
      },
      {
        term: "Inflacja",
        icon: <TrendingUpDown size={18} />,
        definition:
          "Wzrost cen towarów i usług w czasie, co oznacza spadek siły nabywczej pieniądza.",
        details: [
          "Przykład: Jeśli inflacja wynosi 5%, to za rok za 100 zł kupisz mniej niż dziś.",
          "NBP (Narodowy Bank Polski) stara się utrzymać inflację około 2,5%.",
          "Wysoka inflacja zmniejsza wartość oszczędności.",
          "Inwestycje pomagają chronić się przed inflacją."
        ],
      },
      {
        term: "Debet",
        icon: <HandCoins size={18} />,
        definition:
          "Możliwość wydania większej kwoty niż masz na koncie - krótkoterminowa pożyczka od banku.",
        details: [
          "Też nazywany \"kredytem w koncie.\"",
          "Zazwyczaj ma bardzo wysokie oprocentowanie.",
          "Używaj tylko w nagłych wypadkach.",
          "Lepiej unikać i budować fundusz awaryjny."
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
        <h2 className="text-xl font-semibold" style={{ color: "#000000ff" }}>
          Edukacja Finansowa
        </h2>
        <p className="text-slate-500">Podstawowe pojęcia finansowe</p>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((t) => (
          <div
            key={t.title}
            className="bg-white rounded-2xl shadow-sm p-4 border"
            style={{ borderColor: "#ac85e0ff", backgroundColor: "#ffffff" }}
          >
            <p className="font-semibold mb-1 flex items-center gap-2" style={{ color: "#ac85e0ff" }}>
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
        className="bg-white rounded-2xl shadow-sm border p-6"
        style={{ borderColor: "rgba(148, 179, 253, 0.3)", backgroundColor: "#ffffff" }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-semibold" style={{ color: "#000000ff" }}>
              Słownik Pojęć Finansowych
            </p>
            <p className="text-slate-500 text-sm">
              Kliknij na termin, aby dowiedzieć się więcej
            </p>
          </div>

          <Button 
            onClick={() => setOpenAll((v) => !v)}
            style={{ backgroundColor: "#d0b7f1ff", color: "#000000ff" }}
          >
            {openAll ? "Zwiń wszystko" : "Rozwiń wszystko"}
          </Button>
        </div>

        <div className="space-y-2">
          {terms.map((item) => (
            <details
              key={item.term}
              open={openAll}
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: "rgba(148, 179, 253, 0.3)", paddingRight: "1rem" }}
            >
              <summary className="cursor-pointer select-none font-semibold flex items-center gap-3">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ backgroundColor: "rgba(172,133,224,0.12)", color: "#ac85e0ff" }}
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
        className="bg-white rounded-2xl shadow-sm border p-4 space-y-4"
        style={{ borderColor: "rgba(148, 179, 253, 0.3)", backgroundColor: "#ffffff" }}
      >
        <p className="font-semibold" style={{ color: "#000000ff" }}>
          Przydatne Informacje
        </p>

        <div
          className="pl-4 py-2 rounded-r-lg"
          style={{ borderLeft: "4px solid #ac85e0ff", backgroundColor: "#ffffff" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0ff" }}>
            Minimalna Płaca w Polsce (2025)
          </p>
          <p className="text-slate-600 text-sm mt-1">
            4300 zł brutto (około 3200 zł netto). To najniższa legalna pensja, którą pracodawca może wypłacić.
          </p>
        </div>

        <div
          className="pl-4 py-2 rounded-r-lg"
          style={{ borderLeft: "4px solid #ac85e0ff", backgroundColor: "#ffffff" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0ff" }}>
            Ulga Podatkowa
          </p>
          <p className="text-slate-600 text-sm mt-1">
            Kwota wolna od podatku to 30 000 zł rocznie. Oznacza to, że do tej kwoty nie płacisz PIT.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Education;
