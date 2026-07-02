(function () {
  const API_ROOT = "https://public.api.bsky.app/xrpc/";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function linkifyText(text) {
    const escaped = escapeHtml(text || "");
    return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
      const href = url.replace(/[.,!?;:)]+$/, "");
      const suffix = url.slice(href.length);
      return `<a href="${href}" rel="nofollow noopener noreferrer" target="_blank">${href}</a>${suffix}`;
    }).replace(/\n/g, "<br>");
  }

  async function fetchJson(endpoint, params) {
    const url = new URL(endpoint, API_ROOT);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bluesky API request failed: ${response.status}`);
    }
    return response.json();
  }

  async function resolvePostUri(value) {
    const post = value.trim();
    if (post.startsWith("at://")) {
      return post;
    }

    const url = new URL(post);
    const match = url.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/);
    if (!match) {
      throw new Error("Unsupported Bluesky post URL");
    }

    let repo = decodeURIComponent(match[1]);
    const rkey = decodeURIComponent(match[2]);
    if (!repo.startsWith("did:")) {
      const resolved = await fetchJson("com.atproto.identity.resolveHandle", { handle: repo });
      repo = resolved.did;
    }
    return `at://${repo}/app.bsky.feed.post/${rkey}`;
  }

  function renderReply(reply) {
    const post = reply.post;
    const created = post.record && post.record.createdAt ? new Date(post.record.createdAt) : null;
    const createdLabel = created ? created.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
    const authorUrl = `https://bsky.app/profile/${post.author.handle}`;
    const postUrl = `${authorUrl}/post/${post.uri.split("/").pop()}`;
    const avatar = post.author.avatar
      ? `<img class="bluesky-comments__avatar" src="${escapeHtml(post.author.avatar)}" alt="" loading="lazy">`
      : `<span class="bluesky-comments__avatar bluesky-comments__avatar--blank" aria-hidden="true"></span>`;

    return `
      <article class="bluesky-comments__reply">
        <a class="bluesky-comments__avatar-link" href="${authorUrl}" rel="nofollow noopener noreferrer" target="_blank">${avatar}</a>
        <div>
          <p class="bluesky-comments__meta">
            <a href="${authorUrl}" rel="nofollow noopener noreferrer" target="_blank">${escapeHtml(post.author.displayName || post.author.handle)}</a>
            <span>@${escapeHtml(post.author.handle)}</span>
            ${createdLabel ? `<a href="${postUrl}" rel="nofollow noopener noreferrer" target="_blank">${createdLabel}</a>` : ""}
          </p>
          <p class="bluesky-comments__text">${linkifyText(post.record && post.record.text)}</p>
        </div>
      </article>
    `;
  }

  function render(container, rootPost, replies, postUrl) {
    const likeCount = rootPost.likeCount || 0;
    const replyCount = rootPost.replyCount || 0;
    const visibleReplies = replies.filter((reply) => reply && reply.post && !reply.post.notFound && !reply.post.blocked);

    container.innerHTML = `
      <h2>Comments</h2>
      <p class="bluesky-comments__summary">
        <a href="${postUrl}" rel="nofollow noopener noreferrer" target="_blank">Join the discussion on Bluesky</a>
        <span>${replyCount} ${replyCount === 1 ? "reply" : "replies"}</span>
        <span>${likeCount} ${likeCount === 1 ? "like" : "likes"}</span>
      </p>
      ${visibleReplies.length ? visibleReplies.map(renderReply).join("") : "<p>No replies yet.</p>"}
    `;
  }

  async function loadComments(container) {
    const uri = await resolvePostUri(container.dataset.blueskyPost);
    const [postData, threadData] = await Promise.all([
      fetchJson("app.bsky.feed.getPosts", { uris: uri }),
      fetchJson("app.bsky.feed.getPostThread", { uri: uri, depth: "1", parentHeight: "0" })
    ]);
    const rootPost = postData.posts && postData.posts[0];
    if (!rootPost || !threadData.thread || !threadData.thread.post) {
      throw new Error("Bluesky post not found");
    }
    const postUrl = `https://bsky.app/profile/${rootPost.author.handle}/post/${rootPost.uri.split("/").pop()}`;
    render(container, rootPost, threadData.thread.replies || [], postUrl);
  }

  function observe(container) {
    const status = container.querySelector(".bluesky-comments__status");
    const load = () => loadComments(container).catch(() => {
      if (status) {
        status.textContent = "Bluesky comments could not be loaded.";
      }
    });

    if (!("IntersectionObserver" in window)) {
      load();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "300px" });
    observer.observe(container);
  }

  document.querySelectorAll("[data-bluesky-post]").forEach(observe);
}());
