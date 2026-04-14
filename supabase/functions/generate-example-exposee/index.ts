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

    // Step 1: Generate exposé text data
    const textResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Du bist ein Immobilienexperte. Erstelle ein realistisches, hochwertiges Beispiel-Exposé für eine fiktive Immobilie. Antworte NUR mit validem JSON.",
          },
          {
            role: "user",
            content: `Erstelle ein komplettes Beispiel-Exposé für eine attraktive Immobilie. Wähle zufällig eine der folgenden Kategorien: Luxusvilla, Moderne Stadtwohnung, Historisches Stadthaus, Penthouse, Landhaus.

Antworte NUR mit diesem JSON-Format:
{
  "headline": "Attraktiver Titel der Immobilie",
  "objekttyp": "z.B. Einfamilienhaus",
  "baujahr": "z.B. 2019",
  "wohnflaeche": "z.B. 185",
  "grundstueck": "z.B. 620",
  "zimmer": "z.B. 6",
  "schlafzimmer": "z.B. 3",
  "badezimmer": "z.B. 2",
  "kaufpreis": "z.B. 895.000",
  "energieausweis": "z.B. B (45 kWh/m²a)",
  "beschreibung": "3-4 Sätze professionelle Objektbeschreibung",
  "ausstattung": "Aufzählung der Ausstattungsmerkmale, getrennt durch Komma",
  "lage": "2-3 Sätze zur Lage",
  "highlights": "Die wichtigsten Highlights als Aufzählung",
  "bildunterschriften": ["Außenansicht", "Wohnbereich", "Küche", "Schlafzimmer", "Badezimmer", "Garten/Terrasse"],
  "imagePrompts": ["detailed prompt for exterior photo", "detailed prompt for living room", "detailed prompt for kitchen", "detailed prompt for bedroom", "detailed prompt for bathroom", "detailed prompt for garden/terrace"]
}

Die imagePrompts sollen detaillierte englische Beschreibungen sein für fotorealistische Architekturfotos. Jeder Prompt soll den Stil "professional real estate photography, bright natural lighting, wide angle, high resolution, editorial quality" enthalten.`
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!textResponse.ok) {
      const errText = await textResponse.text();
      console.error("OpenAI text error:", textResponse.status, errText);
      throw new Error(`OpenAI API Fehler: ${textResponse.status}`);
    }

    const textData = await textResponse.json();
    const rawContent = textData.choices?.[0]?.message?.content || "";
    
    const exposeeData = JSON.parse(rawContent.trim());
    const imagePrompts: string[] = exposeeData.imagePrompts || [];
    const bildunterschriften: string[] = exposeeData.bildunterschriften || [];

    // Remove helper fields from exposé data
    delete exposeeData.imagePrompts;
    delete exposeeData.bildunterschriften;

    // Step 2: Generate images via DALL-E (max 4)
    const promptsToGenerate = imagePrompts.slice(0, 4);
    
    const imageResults = await Promise.all(
      promptsToGenerate.map(async (prompt: string) => {
        try {
          const imgResponse = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: prompt,
              n: 1,
              size: "1792x1024",
              quality: "standard",
              response_format: "b64_json",
            }),
          });

          if (!imgResponse.ok) {
            console.error("DALL-E error:", imgResponse.status);
            return null;
          }

          const imgData = await imgResponse.json();
          const b64 = imgData.data?.[0]?.b64_json;
          return b64 ? `data:image/png;base64,${b64}` : null;
        } catch (e) {
          console.error("Image gen error:", e);
          return null;
        }
      })
    );

    const generatedImages = imageResults.filter(Boolean) as string[];

    return new Response(
      JSON.stringify({
        exposeeData,
        images: generatedImages,
        bildunterschriften: bildunterschriften.slice(0, generatedImages.length),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-example-exposee error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
