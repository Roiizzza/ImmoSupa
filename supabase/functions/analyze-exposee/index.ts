const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { files, additionalNotes } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: "Keine Dateien hochgeladen." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalSize = files.reduce((sum: number, f: any) => sum + (f.base64?.length || 0) + (f.textContent?.length || 0), 0);
    if (totalSize > 20_000_000) {
      return new Response(JSON.stringify({ error: "Die Dateien sind zu groß. Bitte laden Sie maximal 20 MB hoch." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Separate files by type: text documents first, then images
    const textFiles: any[] = [];
    const imageFiles: any[] = [];
    const otherFiles: any[] = [];

    for (const file of files) {
      if (file.textContent) {
        textFiles.push(file);
      } else if (file.type?.startsWith("image/") && file.base64) {
        imageFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    }

    // Build content array - TEXT DOCUMENTS FIRST so AI prioritizes them
    const content: any[] = [
      {
        type: "text",
        text: `Du bist ein erfahrener Immobilienmakler und Exposé-Experte.

DEINE AUFGABE:
1. Lies ZUERST alle Textdokumente sorgfältig durch und extrahiere ALLE darin enthaltenen Fakten
2. Analysiere DANACH die Bilder und ergänze visuelle Eindrücke
3. Die Fakten aus den Dokumenten haben HÖCHSTE PRIORITÄT und müssen 1:1 übernommen werden. Erfinde KEINE Werte!

WICHTIG ZU DEN BILDERN:
- Ordne die Bilder in eine LOGISCHE Reihenfolge: Außenansicht zuerst, dann Wohnzimmer, Küche, Schlafzimmer, Bad, weitere Räume, Garten/Balkon
- Gib im Feld "bildreihenfolge" die Indizes der Bilder (0-basiert) in der empfohlenen Reihenfolge an

Antworte STRENG nur mit einem JSON-Objekt (keine Markdown, kein Code-Block):
{
  "headline": "Emotionale, verkaufsfördernde Headline",
  "objekttyp": "z.B. Etagenwohnung, Einfamilienhaus, Villa",
  "angebotstyp": "kauf oder miete",
  "immobilientyp": "haus oder wohnung",
  "baujahr": "Exakter Wert oder leer lassen",
  "sanierungsstand": "z.B. kernsaniert 2024, Erstbezug nach Sanierung, oder leer",
  "wohnflaeche": "Nur Zahl ohne Einheit oder leer",
  "grundstueck": "Nur Zahl ohne Einheit oder leer (nur bei Häusern)",
  "zimmer": "Zahl oder leer",
  "schlafzimmer": "Zahl oder leer",
  "badezimmer": "Zahl oder leer",
  "kaufpreis": "Preis z.B. 495.000 oder leer",
  "kaltmiete": "Monatliche Kaltmiete z.B. 1.200 oder leer",
  "energieausweis": "Energieeffizienzklasse z.B. B oder leer",
  "heizungsart": "z.B. Wärmepumpe, Gas-Zentralheizung, Fernwärme oder leer",
  "bezugsfrei": "z.B. sofort, ab 01.06.2025, vermietet oder leer",
  "stellplaetze": "z.B. 2 Tiefgaragenplätze, 1 Stellplatz oder leer",
  "balkon": "z.B. Südbalkon 8m², Terrasse + Garten 120m² oder leer",
  "keller": "z.B. Keller 15m², Abstellraum oder leer",
  "etage": "z.B. 3. OG mit Aufzug, EG oder leer",
  "provision": "z.B. 3,57% inkl. MwSt. oder provisionsfrei oder leer",
  "hausgeld": "Monatliches Hausgeld z.B. 350 (nur bei Wohnungen) oder leer",
  "beschreibung": "Emotionale, ausführliche Objektbeschreibung (4-5 Sätze)",
  "ausstattung": "Kommagetrennte Liste ALLER Ausstattungsmerkmale",
  "lage": "Adresse + Umgebungsbeschreibung (2-3 Sätze)",
  "highlights": "Bullet-Points mit Zeilenumbruch getrennt",
  "title": "Kurzform der Headline",
  "description": "Zusammenfassung (2 Sätze)",
  "price_numeric": 495000,
  "area_sqm": 127,
  "rooms": 4,
  "address": "Exakte Adresse oder leer",
  "bildunterschriften": ["Beschreibung Bild 0", "Beschreibung Bild 1"],
  "bildreihenfolge": [2, 0, 1, 3]
}

WICHTIG: Felder die nicht aus den Dokumenten/Bildern ermittelt werden können, als LEEREN STRING "" zurückgeben, NICHT "–" oder erfundene Werte!`,
      },
    ];

    // Add text documents FIRST with clear labels
    if (textFiles.length > 0) {
      content.push({
        type: "text",
        text: `\n\n========== WICHTIGE DOKUMENTE MIT FAKTEN ==========\nDie folgenden Textdokumente enthalten die verbindlichen Objektdaten. Übernimm ALLE Zahlen und Fakten exakt!\n`,
      });

      for (const file of textFiles) {
        content.push({
          type: "text",
          text: `\n--- DOKUMENT: ${file.name} ---\n${file.textContent}\n--- ENDE ---\n`,
        });
      }
    }

    // Add additional notes from user if provided
    if (additionalNotes && additionalNotes.trim()) {
      content.push({
        type: "text",
        text: `\n\n========== ERGÄNZUNGEN VOM NUTZER ==========\nDer Nutzer hat folgende zusätzliche Informationen bereitgestellt. Diese haben HOHE PRIORITÄT und müssen berücksichtigt werden:\n\n${additionalNotes.trim()}\n`,
      });
    }


    // Add other binary files as context
    for (const file of otherFiles) {
      content.push({
        type: "text",
        text: `[Dokument: ${file.name} (${file.type})] — Binärdatei, Inhalt konnte nicht als Text extrahiert werden.`,
      });
    }

    // Add images LAST
    if (imageFiles.length > 0) {
      content.push({
        type: "text",
        text: `\n\n========== BILDER DER IMMOBILIE ==========\nEs folgen ${imageFiles.length} Bilder. Analysiere sie und ordne sie in eine logische Reihenfolge (Außen → Wohnen → Küche → Schlafzimmer → Bad → Garten → Details).\n`,
      });

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        content.push({
          type: "text",
          text: `[Bild ${i} – ${file.name}]`,
        });
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${file.type};base64,${file.base64}`,
            detail: "high",
          },
        });
      }
    }

    console.log(`Analyzing ${files.length} files (${textFiles.length} text, ${imageFiles.length} images) with GPT-4o...`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content }],
        max_tokens: 3000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "API-Rate-Limit erreicht. Bitte versuchen Sie es in einer Minute erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || errorText.includes("insufficient_quota")) {
        return new Response(JSON.stringify({ error: "Das API-Guthaben ist aufgebraucht. Bitte laden Sie Ihr OpenAI-Konto auf." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "KI-Analyse fehlgeschlagen. Bitte versuchen Sie es erneut." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const aiText = result.choices?.[0]?.message?.content || "";

    console.log("AI response:", aiText.substring(0, 500));

    let exposeeData;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        exposeeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw:", aiText);
      return new Response(JSON.stringify({ error: "KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: exposeeData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);

    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    if (message.includes("insufficient_quota")) {
      return new Response(JSON.stringify({ error: "Das API-Guthaben ist aufgebraucht. Bitte laden Sie Ihr OpenAI-Konto auf." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
