const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const FLOOR_PLAN_ANALYSIS_SYSTEM_PROMPT = `You are a technical architectural rendering system. Your task is to convert a 2D floor plan into a strict scene specification for a downstream 3D renderer.

STRICT RULES:
- The 2D floor plan is the single source of truth
- Do NOT modify, optimize, or reinterpret the layout
- Do NOT add or remove any walls
- Do NOT change wall thickness
- Do NOT change room sizes or proportions
- All walls must match exactly in length, angle, and connection
- All corners must remain sharp and identical (no smoothing, no rounding)

OPENINGS:
- Doors and windows must remain in the exact same position, width, and orientation
- Door swing direction must match if visible in the plan

STRUCTURE:
- Maintain exact spatial relationships between all rooms
- Keep all alignments perfectly consistent with the floor plan

Extract only what is clearly visible in the uploaded 2D plan.
Never invent rooms, walls, doors, windows, stairs, balconies, fixtures, furniture, levels, materials, or labels.
If something is unclear, omit it.
Ignore all dimensions, measurements, arrows, legends, scale bars, hatchings, annotations, and decorative graphics.
Use room labels only if they are actually readable on the plan. If a room has no readable label, mark it as unlabeled.

Return ONLY these sections in English and nothing else:
OUTER_SHAPE:
LEVELS:
SPACES:
DOORS:
WINDOWS:
TEXT_TO_REMOVE:`;

const FLOOR_PLAN_ANALYSIS_USER_PROMPT = `Analyze this uploaded 2D floor plan. Create a strict, minimal scene specification.
GEOMETRY LOCK: Treat the floor plan as a blueprint, not a suggestion. Every wall segment must be replicated exactly. Angles must not be approximated. Distances must not be guessed or normalized. Do not align walls differently than in the input. Do not center, scale, or rebalance the layout. If unsure, preserve the original structure exactly rather than improving it.
OPENING LOCK: Every door and window must match the exact placement in the plan. Keep orientation and hinge direction if shown. Do not standardize sizes. Do not reposition for visual balance.
Describe only verified geometry and readable labels. Do not interpret, improve, or complete missing information.`;

const buildStableRenderPrompt = (floorPlanDescription: string) => `You are a technical architectural rendering system. Convert this floor-plan specification into one clean 3D visualization.

FLOOR-PLAN SPECIFICATION:
${floorPlanDescription}

STRICT GEOMETRY RULES:
- The specification is the single source of truth
- Do NOT modify, optimize, or reinterpret the layout
- Do NOT add or remove any walls
- Do NOT change wall thickness, room sizes, or proportions
- All walls must match exactly in length, angle, and connection
- All corners must remain sharp and identical (no smoothing, no rounding)
- Every door and window must match the exact placement
- Keep orientation and hinge direction as specified
- Do not standardize sizes or reposition for visual balance
- Maintain exact spatial relationships between all rooms

GEOMETRY LOCK:
- Treat the specification as a blueprint, not a suggestion
- Every wall segment must be replicated exactly
- Angles must not be approximated
- Distances must not be guessed or normalized
- Do not align walls differently than specified
- Do not center, scale, or rebalance the layout
- If unsure, preserve the original structure exactly rather than improving it

VISUALIZATION STYLE:
- Clean isometric or slightly perspective top-down view
- Show the full apartment
- Remove the roof, keep walls visible at a consistent height
- Solid pure white extruded walls
- Light neutral colors (white, beige, light wood floors)
- Soft natural lighting
- Neutral light grey background

FORBIDDEN:
- No text labels, annotations, or measurements
- No furniture, people, plants, or decorations
- No redesign or creative interpretation
- No added architectural elements
- No curved walls unless explicitly present in specification
- No changing proportions for better visuals
- No hiding walls behind furniture or camera angles
- No artistic reinterpretation

PRIORITY: Accuracy over aesthetics. Geometry must be correct even if the result looks less realistic.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Kein Grundriss-Bild gesendet." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating 3D floor plan from 2D grundriss via OpenAI...");

    // Step 1: Analyze the floor plan with GPT-4o vision
    const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: FLOOR_PLAN_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: FLOOR_PLAN_ANALYSIS_USER_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/png"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("GPT-4o analysis error:", analysisResponse.status, errorText);
      throw new Error("Grundriss-Analyse fehlgeschlagen.");
    }

    const analysisResult = await analysisResponse.json();
    const floorPlanDescription = analysisResult.choices?.[0]?.message?.content || "";

    console.log("Floor plan analysis:", floorPlanDescription.substring(0, 300));

    // Step 2: Generate 3D isometric rendering with DALL-E 3
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: buildStableRenderPrompt(floorPlanDescription),
        n: 1,
        size: "1792x1024",
        quality: "hd",
        style: "natural",
        response_format: "b64_json",
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("DALL-E error:", imageResponse.status, errorText);

      if (imageResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate-Limit erreicht. Bitte warten Sie einen Moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (imageResponse.status === 402 || errorText.includes("insufficient_quota")) {
        return new Response(JSON.stringify({ error: "OpenAI-Guthaben aufgebraucht. Bitte laden Sie auf." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "3D-Grundriss-Generierung fehlgeschlagen." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imgData = await imageResponse.json();
    const b64 = imgData.data?.[0]?.b64_json;

    if (!b64) {
      console.error("No image in DALL-E response");
      return new Response(JSON.stringify({ error: "Keine 3D-Darstellung generiert. Bitte versuchen Sie es erneut." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatedImage = `data:image/png;base64,${b64}`;

    console.log("3D floor plan generated successfully via OpenAI");

    return new Response(JSON.stringify({ image: generatedImage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
