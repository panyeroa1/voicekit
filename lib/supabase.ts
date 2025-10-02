/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables for configuration, but use the provided
// values as a fallback if they are not set in the environment.
export const supabaseUrl = process.env.SUPABASE_URL || 'https://csewoobligshhknqmvgc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzZXdvb2JsaWdzaGhrbnFtdmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTI4ODEsImV4cCI6MjA3MzE4ODg4MX0.AJkGs1K7GgMMoBzoIBzbwQMJNpXeixj1evmlLM1xhFA';


// Ensure the variables are not empty
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);