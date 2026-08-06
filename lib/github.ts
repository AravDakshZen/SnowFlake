import { Octokit } from 'octokit';

export interface GitHubFile {
  path: string;
  content: string;
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

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return { path, content };
    } catch (error) {
      console.error(`[v0] Failed to fetch ${path}:`, error);
      throw error;
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
      throw error;
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
      throw error;
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
      console.error(`[v0] Failed to add labels to PR ${prNumber}:`, error);
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
      throw error;
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
        events: ['push', 'workflow_run'],
        active: true,
      });

      return response.data.id;
    } catch (error) {
      console.error('[v0] Failed to register webhook:', error);
      throw error;
    }
  }
}
