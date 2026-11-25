export interface Post {
  slug: string;
  publishedAt: Date;
}

const posts: Post[] = [{ slug: "first", publishedAt: new Date("2026-11-25") }];

export function index(items: readonly Post[]): Map<string, Post> {
  return new Map(items.map((item) => [item.slug, item]));
}

export function findPost(slug: string): Post | undefined {
  return get(index(posts), slug);
}

function get(postsBySlug: Map<string, Post>, slug: string): Post | undefined {
  return postsBySlug.get(slug);
}
