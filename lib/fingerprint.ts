import { getSql } from './db';
import crypto from 'crypto';

export async function fingerprintStackTrace(stackTrace: string): Promise<string> {
  // Extract key information from stack trace for fingerprinting
  const lines = stackTrace.split('\n');
  const errorLine = lines[0] || '';
  const keyLines = lines
    .slice(0, 5)
    .filter((line) => line.includes('at ') || line.includes('Error'))
    .join('|');

  return crypto.createHash('sha256').update(`${errorLine}|${keyLines}`).digest('hex');
}

export async function findDuplicateCluster(
  projectId: string,
  embedding: number[],
  threshold: number = 0.85
): Promise<{ clusterId: string; similarity: number } | null> {
  try {
    const sql = getSql();

    // Query pgvector for similar embeddings
    const query = `
      SELECT 
        c.id as cluster_id,
        1 - (al.embedding <=> $1::vector) as similarity
      FROM public.api_logs al
      JOIN public.clusters c ON al.cluster_id = c.id
      WHERE c.project_id = $2
      AND al.embedding IS NOT NULL
      ORDER BY al.embedding <-> $1::vector
      LIMIT 1
    `;

    const results = await sql.unsafe(query, [
      JSON.stringify(embedding),
      projectId,
    ]);

    if (results.length > 0 && results[0].similarity >= threshold) {
      return {
        clusterId: results[0].cluster_id,
        similarity: results[0].similarity,
      };
    }

    return null;
  } catch (error) {
    console.error('[v0] Error finding duplicate cluster:', error);
    return null;
  }
}

export async function getClusterSimilarErrors(
  clusterId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    const sql = getSql();

    const query = `
      SELECT 
        al.id,
        al.endpoint,
        al.method,
        al.status_code,
        al.created_at
      FROM public.api_logs al
      WHERE al.cluster_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `;

    const results = await sql.unsafe(query, [clusterId, limit]);
    return results;
  } catch (error) {
    console.error('[v0] Error fetching similar errors:', error);
    return [];
  }
}
