const GIST_API = 'https://api.github.com/gists';
const GIST_FILENAME = 'bookmark-tree.json';
const GIST_DESCRIPTION = 'Bookmark Sync - Browser Extension Data';

export class GistClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  /** 查找或创建 Bookmark Sync 专用 Gist */
  async getOrCreateGist(): Promise<{ gistId: string; content: string | null; hash: string }> {
    // 先查找已有的
    const gists = await this.listGists();
    const existing = gists.find((g: any) => g.description === GIST_DESCRIPTION);

    if (existing) {
      const detail = await this.fetchGist(existing.id);
      const file = detail.files[GIST_FILENAME];
      return {
        gistId: existing.id,
        content: file?.content ?? null,
        hash: detail.history?.[0]?.version ?? '',
      };
    }

    // 创建新的
    const res = await fetch(GIST_API, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: { [GIST_FILENAME]: { content: '{}' } },
      }),
    });

    if (!res.ok) throw new Error(`创建 Gist 失败: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { gistId: data.id, content: '{}', hash: data.history?.[0]?.version ?? '' };
  }

  /** 更新 Gist 内容 */
  async updateGist(gistId: string, content: string): Promise<string> {
    const res = await fetch(`${GIST_API}/${gistId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content } },
      }),
    });

    if (!res.ok) throw new Error(`更新 Gist 失败: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.history?.[0]?.version ?? '';
  }

  /** 获取 Gist 详情 */
  async fetchGist(gistId: string): Promise<any> {
    const res = await fetch(`${GIST_API}/${gistId}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`获取 Gist 失败: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** 列出当前用户的 Gists */
  private async listGists(): Promise<any[]> {
    const res = await fetch(`${GIST_API}?per_page=100`, { headers: this.headers() });
    if (!res.ok) throw new Error(`列出 Gist 失败: ${res.status}`);
    return res.json();
  }

  /** 验证 Token 有效性 */
  async validateToken(): Promise<boolean> {
    try {
      const res = await fetch('https://api.github.com/user', { headers: this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }
}