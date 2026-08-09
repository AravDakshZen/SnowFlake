import { Octokit } from 'octokit';

export interface GitHubFile {
  path: string;
  content: string;
}

export interface GitHubFileWithSHA extends GitHubFile {
  sha: string;
  encoding: string;
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  files: Array<{ path: string; additions: number; deletions: number }>;
}

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  private isTokenExpired(error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    return status === 401 || status === 403;
  }

  private rethrowAuth(error: unknown): never {
    if (this.isTokenExpired(error)) {
      throw new Error(
        'GitHub token is invalid or has expired. Reconnect your GitHub account in Settings.'
      );
    }
    throw error;
  }

  async getFile(path: string, ref: string = 'main'): Promise<GitHubFile> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if (Array.isArray(response.data)) {
        throw new Error('Path is a directory');
      }

      if (response.data.type !== 'file' || typeof response.data.content !== 'string') {
        throw new Error('Path is not a readable file')
      }
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
      return { path, content }
    } catch (error) {
      console.error(`[v0] Failed to fetch ${path}:`, error);
      this.rethrowAuth(error);
    }
  }

  async getFileWithSHA(path: string, ref: string = 'main'): Promise<GitHubFileWithSHA> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });

      if (Array.isArray(response.data)) {
        throw new Error('Path is a directory');
      }

      if (response.data.type !== 'file' || typeof response.data.content !== 'string') {
        throw new Error('Path is not a readable file')
      }
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
      return {
        path,
        content,
        sha: response.data.sha,
        encoding: response.data.encoding || 'base64',
      }
    } catch (error) {
      console.error(`[v0] Failed to fetch ${path}:`, error);
      this.rethrowAuth(error);
    }
  }

  async createBranch(branchName: string, baseBranch: string = 'main'): Promise<void> {
    try {
      const baseRef = await this.octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${baseBranch}`,
      });

      await this.octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha,
      });
    } catch (error) {
      console.error(`[v0] Failed to create branch ${branchName}:`, error);
      this.rethrowAuth(error);
    }
  }

  async commitFile(
    branchName: string,
    filePath: string,
    content: string,
    message: string
  ): Promise<void> {
    try {
      const existingFile = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: branchName,
      });

      if (!Array.isArray(existingFile.data)) {
        await this.octokit.rest.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          message,
          content: Buffer.from(content).toString('base64'),
          branch: branchName,
          sha: existingFile.data.sha,
        });
      }
    } catch (error) {
      this.rethrowAuth(error);
      // File doesn't exist, create it
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: branchName,
      });
    }
  }

  async createPullRequest(
    branchName: string,
    title: string,
    body: string,
    baseBranch: string = 'main'
  ): Promise<{ url: string; number: number }> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head: branchName,
        base: baseBranch,
      });

      return {
        url: response.data.html_url,
        number: response.data.number,
      };
    } catch (error) {
      console.error('[v0] Failed to create pull request:', error);
      this.rethrowAuth(error);
    }
  }

  async addPRLabel(prNumber: number, labels: string[]): Promise<void> {
    try {
      await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        labels,
      });
    } catch (error) {
      if (this.isTokenExpired(error)) {
        console.error('[v0] GitHub token invalid while adding labels:', error);
        return;
      }
      // Label may not exist yet — create it, then retry once.
      try {
        for (const label of labels) {
          await this.octokit.rest.issues.createLabel({
            owner: this.owner,
            repo: this.repo,
            name: label,
            color: '0e1116',
          });
        }
        await this.octokit.rest.issues.addLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: prNumber,
          labels,
        });
      } catch (retryError) {
        console.error(`[v0] Failed to create/add labels to PR ${prNumber}:`, retryError);
      }
    }
  }

  async fetchCILog(runId: number): Promise<string> {
    try {
      const jobs = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });
      const job = jobs.data.jobs[0];
      if (!job) return '';

      const logs = await this.octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        job_id: job.id,
      });
      const raw = logs.data as unknown;
      if (typeof raw === 'string') return raw;
      if (raw instanceof ArrayBuffer) return Buffer.from(new Uint8Array(raw)).toString('utf-8');
      if (raw instanceof Uint8Array) return Buffer.from(raw).toString('utf-8');
      return String(raw ?? '');
    } catch (error) {
      console.error('[v0] Failed to fetch CI log:', error);
      return '';
    }
  }

  async listRepos(): Promise<Array<{ owner: string; name: string; defaultBranch: string; language?: string; isPrivate: boolean }>> {
    try {
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
      });

      return response.data.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        defaultBranch: repo.default_branch,
        language: repo.language || undefined,
        isPrivate: repo.private,
      }));
    } catch (error) {
      console.error('[v0] Failed to list repos:', error);
      this.rethrowAuth(error);
    }
  }

  async getLatestCommit(ref?: string): Promise<GitHubCommitInfo> {
    const branch = ref ?? 'main';
    try {
      const { data: commit } = await this.octokit.rest.repos.getCommit({
        owner: this.owner,
        repo: this.repo,
        ref: branch,
      });

      const files = (commit.files ?? []).map((file) => ({
        path: file.filename ?? '',
        additions: file.additions ?? 0,
        deletions: file.deletions ?? 0,
      }));

      return {
        sha: commit.sha,
        message: commit.commit.message,
        authorName: commit.commit.author?.name ?? '',
        authorEmail: commit.commit.author?.email ?? '',
        date: commit.commit.author?.date ?? new Date().toISOString(),
        files,
      };
    } catch (error) {
      console.error('[v0] Failed to fetch latest commit:', error);
      this.rethrowAuth(error);
    }
  }

  async getCommitFile(path: string, sha: string): Promise<GitHubFile> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: sha,
      });

      if (Array.isArray(response.data)) {
        throw new Error('Path is a directory');
      }

      if (response.data.type !== 'file' || typeof response.data.content !== 'string') {
        throw new Error('Path is not a readable file')
      }
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
      return { path, content }
    } catch (error) {
      console.error(`[v0] Failed to fetch ${path} at ${sha}:`, error);
      this.rethrowAuth(error);
    }
  }

  async getProfile(): Promise<{ login: string; name?: string; avatarUrl?: string; htmlUrl?: string; bio?: string; publicRepos?: number }> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return {
        login: data.login,
        name: data.name ?? undefined,
        avatarUrl: data.avatar_url,
        htmlUrl: data.html_url,
        bio: data.bio ?? undefined,
        publicRepos: data.public_repos,
      };
    } catch (error) {
      console.error('[v0] Failed to fetch GitHub profile:', error);
      this.rethrowAuth(error);
    }
  }

  async registerWebhook(webhookUrl: string): Promise<number> {
    try {
      const response = await this.octokit.rest.repos.createWebhook({
        owner: this.owner,
        repo: this.repo,
        name: 'web',
        config: {
          url: webhookUrl,
          content_type: 'json',
        },
        events: ['push', 'workflow_run', 'pull_request'],
        active: true,
      });

      return response.data.id;
    } catch (error) {
      console.error('[v0] Failed to register webhook:', error);
      this.rethrowAuth(error);
    }
  }
}
