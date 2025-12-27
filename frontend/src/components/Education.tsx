/**
 * Education page - financial education content.
 */
import { useMemo, useState } from "react";
import { Button } from "./ui/button";

type Term = {
  term: string;
  definition: string;
  details: string[];
};

type Tip = {
  title: string;
  description: string;
};

export function Education() {
  const tips: Tip[] = useMemo(
    () => [
      {
        title: "do zrobienia",
        description:
          "do zrobienia",
      },
      {
        title: "do zrobienia",
        description:
          "do zrobienia",
      },
      {
        title: "do zrobienia",
        description:
          "do zrobienia",
      },
      {
        title: "do zrobienia",
        description:
          "do zrobienia",
      },
    ],
    []
  );

  const terms: Term[] = useMemo(
    () => [
      {
        term: "Podatek",
        definition:
          "Obowiązkowa opłata pobierana przez państwo od obywateli i firm. W Polsce najważniejsze podatki to:",
        details: [
          "x",
        ],
      },
      {
        term: "Budżet",
        definition:
          "Plan finansowy przychodów i wydatków na dany okres – pomaga kontrolować pieniądze.",
        details: [
          "x",
        ],
      },
      {
        term: "Inwestycja",
        definition:
          "Przeznaczenie pieniędzy na aktywa, które mogą przynieść zysk w przyszłości.",
        details: ["x"],
      },
      {
        term: "Kredyt",
        definition:
          "Pożyczka od banku/instytucji finansowej, którą spłacasz z odsetkami.",
        details: [
          "x",
        ],
      },
      {
        term: "Oszczędności",
        definition:
          "Pieniądze odłożone na przyszłość – niewydane z bieżących dochodów.",
        details: [
          "x",
        ],
      },
      {
        term: "Odsetki",
        definition:
          "Koszt pożyczenia pieniędzy lub nagroda za oszczędzanie.",
        details: ["x"],
      },
      {
        term: "Inflacja",
        definition:
          "Wzrost cen w czasie – pieniądz ma mniejszą siłę nabywczą.",
        details: [
          "x",
        ],
      },
      {
        term: "Debet",
        definition:
          "Możliwość wydania więcej niż masz na koncie – krótkoterminowa pożyczka od banku.",
        details: ["x"],
      },
    ],
    []
  );

  const [openAll, setOpenAll] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "#ac85e0ff" }}>
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
            style={{ borderColor: "rgba(148, 179, 253, 0.3)" }}
          >
            <p className="font-semibold mb-1" style={{ color: "#ac85e0ff" }}>
              {t.title}
            </p>
            <p className="text-slate-600 text-sm">{t.description}</p>
          </div>
        ))}
      </div>

      {/* Dictionary */}
      <div
        className="bg-white rounded-2xl shadow-sm border p-6"
        style={{ borderColor: "rgba(148, 179, 253, 0.3)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-semibold" style={{ color: "#ac85e0ff" }}>
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
              <summary className="cursor-pointer select-none font-semibold">
                {item.term}
              </summary>

              <div className="pt-3 space-y-3">
                <p className="text-slate-700 text-sm">{item.definition}</p>
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
        style={{ borderColor: "rgba(148, 179, 253, 0.3)" }}
      >
        <p className="font-semibold" style={{ color: "#ac85e0ff" }}>
          Przydatne Informacje
        </p>

        <div
          className="pl-4 py-2 rounded-r-lg"
          style={{ borderLeft: "4px solid #ac85e0ff", backgroundColor: "rgba(232, 240, 255, 0.5)" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0ff" }}>
            do zrobienia 
          </p>
          <p className="text-slate-600 text-sm mt-1">
            do zrobienia
          </p>
        </div>

        <div
          className="pl-4 py-2 rounded-r-lg"
          style={{ borderLeft: "4px solid #ac85e0ff", backgroundColor: "rgba(232, 240, 255, 0.5)" }}
        >
          <p className="font-semibold" style={{ color: "#ac85e0ff" }}>
            do zrobienia
          </p>
          <p className="text-slate-600 text-sm mt-1">
            do zrobienia
          </p>
        </div>
      </div>
    </div>
  );
}

export default Education;
