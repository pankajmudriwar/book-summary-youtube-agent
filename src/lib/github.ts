/**
 * Trigger the GitHub Actions `video-worker.yml` workflow via the REST API.
 *
 * @param bookId  - ID of the book row in Supabase
 * @param stages  - Optional comma-separated pipeline stages to run
 *                  (defaults to the full pipeline when omitted)
 */
export async function triggerVideoWorker(
  bookId: string,
  stages?: string,
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'pankajmudriwar';
  const repo = process.env.GITHUB_REPO_NAME || 'book-summary-youtube-agent';

  if (!token) {
    return {
      success: false,
      error:
        'Missing required env var: GITHUB_TOKEN (Personal Access Token with actions:write scope)',
    };
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/video-worker.yml/dispatches`;

  const inputs: Record<string, string> = { book_id: bookId };
  if (stages) {
    inputs.stages = stages;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs,
      }),
    });

    if (response.status === 204) {
      return { success: true };
    }

    const body = await response.text();
    return {
      success: false,
      error: `GitHub API responded with ${response.status}: ${body}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to dispatch workflow: ${message}` };
  }
}
