import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorResult {
  competitor: string;
  analysis: string;
  citations: string[];
  pricing_info?: any;
  features?: string[];
  positioning?: string;
  strengths?: string[];
  weaknesses?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { businessIdeaId, competitors, niche } = await req.json();

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return new Response(
        JSON.stringify({ error: "Competitors array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Perplexity API key
    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("encrypted_key_secure")
      .eq("user_id", user.id)
      .eq("provider", "perplexity")
      .maybeSingle();

    let perplexityApiKey: string | null = null;
    
    if (keyData?.encrypted_key_secure) {
      // Decrypt the API key
      const encryptionSecret = Deno.env.get("API_KEY_ENCRYPTION_SECRET");
      if (encryptionSecret) {
        try {
          const keyBytes = new Uint8Array(keyData.encrypted_key_secure);
          const iv = keyBytes.slice(0, 12);
          const encryptedData = keyBytes.slice(12);
          
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(encryptionSecret.padEnd(32).slice(0, 32)),
            { name: "AES-GCM" },
            false,
            ["decrypt"]
          );
          
          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            cryptoKey,
            encryptedData
          );
          
          perplexityApiKey = new TextDecoder().decode(decrypted);
        } catch (decryptError) {
          console.error("Error decrypting Perplexity key:", decryptError);
        }
      }
    }

    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ error: "Perplexity API key not configured. Please add it in AI Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing ${competitors.length} competitors in ${niche} niche`);

    const results: CompetitorResult[] = [];

    // Analyze each competitor
    for (const competitor of competitors.slice(0, 5)) { // Limit to 5 competitors
      try {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              {
                role: "user",
                content: `Analyze "${competitor}" as a competitor in the ${niche || "business"} market. 
                
Provide a structured analysis with:
1. **Pricing Structure**: Specific tiers and pricing if available
2. **Key Features**: Main product/service features (list 3-5)
3. **Target Audience**: Who they serve
4. **Positioning**: How they position themselves in the market
5. **Strengths**: Top 3 competitive advantages
6. **Weaknesses**: Top 3 potential weaknesses or gaps
7. **Recent News**: Any significant updates in the last 3 months

Format each section clearly with headers.`
              }
            ],
            search_recency_filter: "month"
          }),
        });

        if (!response.ok) {
          console.error(`Perplexity API error for ${competitor}:`, response.status);
          continue;
        }

        const data = await response.json();
        const analysisText = data.choices?.[0]?.message?.content || "";
        
        // Parse the analysis into structured data
        const parsed = parseCompetitorAnalysis(analysisText);
        
        results.push({
          competitor,
          analysis: analysisText,
          citations: data.citations || [],
          ...parsed
        });

        // Store in database
        await supabase.from("competitor_analyses").upsert({
          user_id: user.id,
          business_idea_id: businessIdeaId || null,
          competitor_name: competitor,
          pricing_info: parsed.pricing_info,
          features: parsed.features,
          positioning: parsed.positioning,
          strengths: parsed.strengths,
          weaknesses: parsed.weaknesses,
          source_urls: data.citations || [],
          analyzed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,competitor_name"
        });

      } catch (compError) {
        console.error(`Error analyzing ${competitor}:`, compError);
      }
    }

    // Generate differentiation strategies
    let strategies: any[] = [];
    
    if (results.length > 0) {
      try {
        const strategyResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "user",
                content: `Based on these competitor analyses for a ${niche || "business"} startup:

${results.map(r => `**${r.competitor}**: ${r.positioning || 'Unknown positioning'}\nStrengths: ${(r.strengths || []).join(', ')}\nWeaknesses: ${(r.weaknesses || []).join(', ')}`).join('\n\n')}

Suggest 3-5 differentiation strategies. For each strategy, provide:
1. Strategy Type: (pricing, features, positioning, or niche)
2. Recommendation: Specific actionable advice
3. Why It Works: Brief explanation of competitive advantage
4. Confidence Score: 1-100 based on market opportunity

Format as a numbered list with clear sections.`
              }
            ]
          }),
        });

        if (strategyResponse.ok) {
          const strategyData = await strategyResponse.json();
          const strategyText = strategyData.choices?.[0]?.message?.content || "";
          strategies = parseStrategies(strategyText);

          // Store strategies
          for (const strategy of strategies) {
            await supabase.from("differentiation_strategies").insert({
              user_id: user.id,
              business_idea_id: businessIdeaId || null,
              strategy_type: strategy.type,
              recommendation: strategy.recommendation,
              confidence_score: strategy.confidence,
              supporting_data: { why_it_works: strategy.why }
            });
          }
        }
      } catch (strategyError) {
        console.error("Error generating strategies:", strategyError);
      }
    }

    console.log(`Analysis complete: ${results.length} competitors, ${strategies.length} strategies`);

    return new Response(
      JSON.stringify({ 
        competitors: results, 
        strategies,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in competitor-analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseCompetitorAnalysis(text: string): Partial<CompetitorResult> {
  const result: Partial<CompetitorResult> = {};
  
  // Extract pricing
  const pricingMatch = text.match(/pricing[^:]*:([\s\S]*?)(?=\*\*|##|$)/i);
  if (pricingMatch) {
    result.pricing_info = { raw: pricingMatch[1].trim().substring(0, 500) };
  }

  // Extract features
  const featuresMatch = text.match(/features?[^:]*:([\s\S]*?)(?=\*\*|##|$)/i);
  if (featuresMatch) {
    const featuresText = featuresMatch[1];
    result.features = featuresText
      .split(/[-•*\n]/)
      .map(f => f.trim())
      .filter(f => f.length > 3 && f.length < 200)
      .slice(0, 5);
  }

  // Extract positioning
  const positioningMatch = text.match(/positioning[^:]*:([\s\S]*?)(?=\*\*|##|$)/i);
  if (positioningMatch) {
    result.positioning = positioningMatch[1].trim().substring(0, 500);
  }

  // Extract strengths
  const strengthsMatch = text.match(/strengths?[^:]*:([\s\S]*?)(?=\*\*weakness|##|$)/i);
  if (strengthsMatch) {
    result.strengths = strengthsMatch[1]
      .split(/[-•*\n\d.]/)
      .map(s => s.trim())
      .filter(s => s.length > 3 && s.length < 200)
      .slice(0, 5);
  }

  // Extract weaknesses
  const weaknessesMatch = text.match(/weakness(?:es)?[^:]*:([\s\S]*?)(?=\*\*|##|recent|$)/i);
  if (weaknessesMatch) {
    result.weaknesses = weaknessesMatch[1]
      .split(/[-•*\n\d.]/)
      .map(w => w.trim())
      .filter(w => w.length > 3 && w.length < 200)
      .slice(0, 5);
  }

  return result;
}

function parseStrategies(text: string): Array<{type: string; recommendation: string; why: string; confidence: number}> {
  const strategies: Array<{type: string; recommendation: string; why: string; confidence: number}> = [];
  
  // Split by numbered items
  const items = text.split(/\d+\.\s+/).filter(Boolean);
  
  for (const item of items.slice(0, 5)) {
    const typeMatch = item.match(/type[^:]*:\s*(\w+)/i);
    const recMatch = item.match(/recommendation[^:]*:([\s\S]*?)(?=why|confidence|$)/i);
    const whyMatch = item.match(/why[^:]*:([\s\S]*?)(?=confidence|$)/i);
    const confMatch = item.match(/confidence[^:]*:\s*(\d+)/i);

    if (recMatch) {
      strategies.push({
        type: typeMatch?.[1]?.toLowerCase() || "features",
        recommendation: recMatch[1].trim().substring(0, 500),
        why: whyMatch?.[1]?.trim().substring(0, 300) || "",
        confidence: parseInt(confMatch?.[1] || "70")
      });
    }
  }

  return strategies;
}
