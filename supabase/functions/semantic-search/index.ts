import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { pipeline } from '@xenova/transformers';

// Initialize the embedding pipeline. It will download the model on the first run.
// Using a server-side singleton pattern to ensure the model is loaded only once.
let extractor = null;
const getExtractor = async () => {
  if (extractor === null) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
};


serve(async (req) => {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, search_query, scope, session_context } = await req.json()

    if (!user_id || !search_query) {
      throw new Error('user_id and search_query are required.');
    }

    const authHeader = req.headers.get('Authorization')!
    // Fix: Use globalThis to access the Deno global in Supabase Edge Functions, resolving the "Cannot find name 'Deno'" error.
    const supabaseClient = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const generateEmbedding = await getExtractor();

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(search_query, {
      pooling: 'mean',
      normalize: true,
    });

    let searchResults;

    if (scope === 'session' && session_context) {
      // Perform in-memory search on the provided session context
      const sessionEmbeddings = await Promise.all(
        session_context.map(turn => 
          generateEmbedding(turn.text, { pooling: 'mean', normalize: true })
        )
      );

      // Simple cosine similarity search
      const similarities = sessionEmbeddings.map(embedding => {
        let dotProduct = 0;
        for (let i = 0; i < queryEmbedding.data.length; i++) {
          dotProduct += queryEmbedding.data[i] * embedding.data[i];
        }
        return dotProduct;
      });
      
      const sortedIndices = similarities
        .map((sim, index) => ({ sim, index }))
        .sort((a, b) => b.sim - a.sim);

      searchResults = sortedIndices.slice(0, 3).map(item => session_context[item.index]);

    } else { // scope is 'long-term'
      // Perform a vector search in the database
      const { data, error } = await supabaseClient.rpc('match_conversation_embeddings', {
        query_embedding: Array.from(queryEmbedding.data),
        match_threshold: 0.7,
        match_count: 5,
        p_user_id: user_id
      });

      if (error) {
        console.error('Vector search error:', error);
        throw error;
      }
      searchResults = data.map(item => ({ text: item.turn_content }));
    }

    const context = searchResults.map(item => item.text).join('\n---\n');
    const finalResult = `Based on my memory, here is some relevant context:\n\n${context}`;

    return new Response(JSON.stringify({ result: finalResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

/* 
-- Run this SQL in your Supabase editor to create the match function
-- This function allows us to perform vector similarity searches
CREATE OR REPLACE FUNCTION match_conversation_embeddings (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  turn_content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    conversation_embeddings.id,
    conversation_embeddings.turn_content,
    1 - (conversation_embeddings.embedding <=> query_embedding) AS similarity
  FROM conversation_embeddings
  WHERE conversation_embeddings.user_id = p_user_id
    AND 1 - (conversation_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
*/