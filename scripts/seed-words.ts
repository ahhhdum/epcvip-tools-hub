#!/usr/bin/env npx ts-node
/**
 * Seed Words Table
 *
 * Populates the words table with:
 * - WORD_LIST (666 words) → tier: 'common'
 * - CHALLENGING_WORDS (1,667 words) → tier: 'challenging'
 *
 * Usage:
 *   cd server && npx ts-node ../scripts/seed-words.ts
 *
 * Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Import word lists
import { WORD_LIST } from '../server/src/utils/word-list';
import { CHALLENGING_WORDS } from '../server/src/data/challenging-words';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Analyze a word for metadata
 */
function analyzeWord(word: string) {
  const normalized = word.toUpperCase();
  const letters = normalized.split('');
  const uniqueLetters = new Set(letters).size;
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const uncommonLetters = ['Q', 'X', 'Z', 'J'];

  // Generate consonant/vowel pattern (e.g., 'CVCCV')
  const letterPattern = letters
    .map((l) => (vowels.includes(l) ? 'V' : 'C'))
    .join('');

  // Check for double letters
  const hasDoubleLetters = letters.some(
    (l, i) => i > 0 && letters[i - 1] === l
  );

  // Check for uncommon letters
  const hasUncommonLetters = letters.some((l) => uncommonLetters.includes(l));

  return {
    word: normalized,
    length: normalized.length,
    letter_pattern: letterPattern,
    unique_letters: uniqueLetters,
    has_double_letters: hasDoubleLetters,
    has_uncommon_letters: hasUncommonLetters,
  };
}

/**
 * Create word record for insertion
 */
function createWordRecord(
  word: string,
  tier: 'common' | 'challenging'
): Record<string, unknown> {
  const analysis = analyzeWord(word);
  return {
    ...analysis,
    tier,
    is_valid_guess: true,
    is_answer_eligible: tier === 'common', // Only common words as daily/random answers
    is_sabotage_eligible: true, // Both tiers eligible for sabotage
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌱 Seeding words table...\n');

  // Deduplicate (in case any overlap)
  const commonSet = new Set(WORD_LIST.map((w) => w.toUpperCase()));
  const challengingSet = new Set(
    CHALLENGING_WORDS.map((w) => w.toUpperCase()).filter(
      (w) => !commonSet.has(w)
    )
  );

  console.log(`📚 Common words: ${commonSet.size}`);
  console.log(`📚 Challenging words: ${challengingSet.size}`);
  console.log(`📚 Total: ${commonSet.size + challengingSet.size}\n`);

  // Create records
  const commonRecords = Array.from(commonSet).map((w) =>
    createWordRecord(w, 'common')
  );
  const challengingRecords = Array.from(challengingSet).map((w) =>
    createWordRecord(w, 'challenging')
  );

  const allRecords = [...commonRecords, ...challengingRecords];

  // Insert in batches (Supabase has limits)
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('words')
      .upsert(batch, { onConflict: 'word', ignoreDuplicates: false })
      .select('word');

    if (error) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors++;
    } else {
      inserted += data?.length || 0;
      process.stdout.write(
        `\r✅ Inserted: ${inserted}/${allRecords.length} words`
      );
    }
  }

  console.log('\n');

  // Verify
  const { count } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total words in database: ${count}`);

  // Show tier breakdown
  const { data: tierCounts } = await supabase.rpc('get_word_tier_counts');

  if (tierCounts) {
    console.log('\n📊 Tier breakdown:');
    tierCounts.forEach((t: { tier: string; count: number }) => {
      console.log(`   ${t.tier}: ${t.count}`);
    });
  } else {
    // Fallback: manual count
    const { count: commonCount } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'common');
    const { count: challengingCount } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'challenging');
    console.log('\n📊 Tier breakdown:');
    console.log(`   common: ${commonCount}`);
    console.log(`   challenging: ${challengingCount}`);
  }

  if (errors > 0) {
    console.log(`\n⚠️  Completed with ${errors} batch errors`);
    process.exit(1);
  } else {
    console.log('\n✅ Seeding complete!');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
